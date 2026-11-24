const EMOTIONS = [
  {name:"기쁨",color:"#f5ba42",words:"기쁘 행복 즐겁 웃음 웃네 웃지 반갑 환희 춤 생기 뛰놀 아름다 고맙 가뿐 설렘 만족 환하게 웃으며 노래 웃고 꽃 즐거움 생동 명랑 기쁨 신명 들떠 밝은"},
  {name:"슬픔",color:"#68a4ff",words:"슬픔 슬퍼 슬피 설움 설음 눈물 괴로 죽는 죽어 죽을 상실 이별 헤어진 한숨 아픔 쓸쓸 울며 우는 섭섭 고달픈 비애 무덤 부서진 눈물로 슬프다 슬피 운다 애도 통곡 애통"},
  {name:"희망",color:"#43d3a6",words:"희망 내일 새로운 꿈꾸 바라는 기다리 믿음 믿습니다 다짐 결실 익어 피어나 씨 뿌려 초인 백마 걸어가 그날이 오면 오리다 용기 소망 길 미래 열리고 회복 새벽 환한 가능성 전진 만날"},
  {name:"사랑",color:"#ef73ae",words:"사랑 연모 애정 헌신 고이 보내드리 진달래 어머니 어머님 키스 맹세 그대 다정 아끼 보살피 정성 손님 따뜻 자상 함께 와 마음 정든 가슴 소중 포근 애틋 사랑하던 사람 서로"},
  {name:"성찰",color:"#9d86ff",words:"부끄럼 부끄러 성찰 반성 양심 거울 자아 근심 진찰 외로 닮았 반대 이름자 생각 고민 깨닫 돌아보 질문 존재 운명 삶의 의미 자책 후회 물음 진지 내면 스스로 알아보 엄격 양심"},
  {name:"저항",color:"#f56f82",words:"빼앗긴 빼앗겨 빼앗기 남의 땅 억압 저항 해방 독립 자유 굴복 맞서 항거 투쟁 분노 역겨워 즈려밟 울분 앞장 용솟음 부조리 치욕 결단 불복 속박 압제 맞서다 항일 드리받 칼"},
  {name:"그리움",color:"#f3a353",words:"그리워 그리움 추억 동경 못 잊 보고 싶 불러도 이름이어 이름을 부르 먼데 멀리 고향 옛날 향수 기다림 아득 옛 맹세 돌아다보 정든 기억 이국 재회 회상 그립 아련 추모 멀었 북간도"},
  {name:"평온",color:"#50cabf",words:"평온 고요 조용 평화 여유 포근 부드러운 안윽 안온 편안 햇살 햇빛 향기 푸른 하늘 바다 숲 강가 잔디 새 노래 졸음 고운 비 맑은 따사로운 안락 휴식 한적 평안 잔잔 산들바람"}
].map(e => ({...e, words:e.words.split(/\s+/)}));

const lexTerms = EMOTIONS.flatMap((emotion, emotionIndex) =>
  emotion.words.map(word => ({word, emotionIndex}))
).sort((a,b) => b.word.length-a.word.length);

let selectedId = 1;
let weights = Object.fromEntries(EMOTIONS.map(e => [e.name,1]));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function tokenize(text) {
  return text.replace(/[^가-힣0-9A-Za-z\s]/g," ").split(/\s+/).filter(Boolean);
}

function analyzeText(text, customWeights=weights) {
  const normalized = text.toLowerCase();
  const counts = EMOTIONS.map(() => 0);
  const evidence = EMOTIONS.map(() => []);
  lexTerms.forEach(({word,emotionIndex}) => {
    let from = 0, found = false;
    while ((from = normalized.indexOf(word,from)) !== -1) {
      counts[emotionIndex]++;
      if (!found) evidence[emotionIndex].push(word);
      found = true;
      from += Math.max(word.length,1);
    }
  });
  const weighted = counts.map((count,i) => count * (customWeights[EMOTIONS[i].name] ?? 1));
  const sum = weighted.reduce((a,b)=>a+b,0);
  const percentages = sum ? roundedPercent(weighted) : EMOTIONS.map(()=>0);
  return {counts, weighted, sum, percentages, evidence};
}

function roundedPercent(values) {
  const sum=values.reduce((a,b)=>a+b,0);
  if(!sum) return values.map(()=>0);
  const exact=values.map(v=>v*100/sum);
  const result=exact.map(Math.floor);
  let remain=100-result.reduce((a,b)=>a+b,0);
  exact.map((v,i)=>({i,r:v-result[i]})).sort((a,b)=>b.r-a.r||a.i-b.i)
    .slice(0,remain).forEach(x=>result[x.i]++);
  return result;
}

function dominant(result) {
  if(!result.sum) return null;
  let index=0;
  result.percentages.forEach((p,i)=>{if(p>result.percentages[index]) index=i;});
  return EMOTIONS[index];
}

function cosine(a,b) {
  let dot=0,ma=0,mb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];ma+=a[i]*a[i];mb+=b[i]*b[i];}
  return ma&&mb?dot/(Math.sqrt(ma)*Math.sqrt(mb)):0;
}

function poemProfile(poem) {
  return analyzeText(poem.text).percentages;
}

function renderList() {
  const query=document.querySelector("#searchInput").value.trim();
  const emotion=document.querySelector("#emotionFilter").value;
  const list=document.querySelector("#poemList");
  const filtered=POEMS.filter(p=>{
    const match=!query || `${p.title} ${p.author}`.toLower.includes(query.toLower());
    return match && (!emotion || p.emotion===emotion);
  });
  list.innerHTML=filtered.map(p=>{
    const e=EMOTIONS.find(x=>x.name===p.emotion);
    return `<button class="poem-item ${p.id===selectedId?"active":""}" data-id="${p.id}">
      <i class="poem-dot" style="background:${e?.color||"#7771ff"}"></i>
      <span><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.author)}</small></span>
      <span class="year">${p.year}</span>
    </button>`;
  }).join("") || `<div class="card-inner" style="color:var(--muted)">검색 결과가 없습니다.</div>`;
  list.querySelectorAll(".poem-item").forEach(btn=>btn.addEventListener("click",()=>{
    selectedId=Number(btn.dataset.id);
    renderList(); renderWork();
  }));
  document.querySelector("#poemCount").textContent=filtered.length;
}

function renderWork() {
  const poem=POEMS.find(p=>p.id===selectedId)||POEMS[0];
  const result=analyzeText(poem.text);
  const dom=dominant(result);
  document.querySelector("#workView").innerHTML=`
    <section class="hero">
      <article class="card hero-copy">
        <div class="eyebrow">WORK ${String(poem.id).padStart(2,"0")} · ${poem.year}</div>
        <h1>${escapeHtml(poem.title)}</h1>
        <p>${escapeHtml(poem.theme)}</p>
        <div class="meta-row">
          <span class="meta-chip">${escapeHtml(poem.author)}</span>
          <span class="meta-chip">${poem.death}년 사망</span>
          <span class="meta-chip">${poem.year}년 발표·수록 기록</span>
          <span class="meta-chip">${dom?dom.name:"근거 부족"}</span>
        </div>
      </article>
      <article class="card hero-score">
        <div><div class="eyebrow">DOMINANT EMOTION</div><div class="big" style="color:${dom?.color||"var(--muted)"}">${dom?dom.name:"—"}</div></div>
        <div><b>${result.sum?`${Math.max(...result.percentages)}%`:"0%"}</b><div class="label">자동 분석 최대 비중</div></div>
      </article>
    </section>
    <section class="grid-2">
      <article class="card card-inner">
        <div class="card-title"><h2>시 원문</h2><small>감정 시어 강조</small></div>
        ${renderPoemBody(poem,result)}
        <div class="source">출처: <a href="${poem.url}" target="_blank" rel="noopener">${escapeHtml(poem.source)}</a></div>
      </article>
      <article class="card card-inner">
        <div class="card-title"><h2>감정 비율</h2><small>${result.sum?"시어 기반 계산":"검출된 시어 없음"}</small></div>
        ${result.sum?renderDonut(result):`<p style="color:var(--muted)">분석 근거가 부족해 비율을 표시할 수 없습니다.</p>`}
        ${renderBars(result)}
      </article>
    </section>
    <section class="grid-2">
      <article class="card card-inner">
        <div class="card-title"><h2>행별 감정 변화</h2><small>줄 중심 누적 비중</small></div>
        ${renderLineChart(poem)}
      </article>
      <article class="card card-inner">
        <div class="card-title"><h2>시어–감정–주제</h2><small>핵심 연결</small></div>
        ${renderFlow(poem,result)}
      </article>
    </section>
    <section class="grid-2">
      <article class="card card-inner">
        <div class="card-title"><h2>감정 반경도</h2><small>정규화 프로필</small></div>
        ${renderRadar(result)}
      </article>
      <article class="card card-inner">
        <div class="card-title"><h2>비슷한 작품</h2><small>코사인 유사도</small></div>
        ${renderRecommendations(poem)}
      </article>
    </section>
    <section class="card card-inner art-grid">
      <canvas id="artCanvas" width="280" height="280" aria-label="감정 비율 디지털 아트"></canvas>
      <div><div class="eyebrow">GENERATIVE COLOR FIELD</div><h2 style="margin-top:5px">감정 비율 디지털 아트</h2><p style="color:var(--muted)">감정 비율을 원형 색 영역과 중심 원으로 시각화합니다. 새 작품을 선택하면 도형과 색 비율도 다시 계산됩니다.</p></div>
    </section>
  `;
  bindPoemLines();
  renderArt(poem,result);
}

function renderPoemBody(poem,result) {
  const lines=poem.text.split(/\n+/).filter(Boolean);
  return `<div class="poem-body">${lines.map((line,i)=>{
    let highlighted=escapeHtml(line);
    lexTerms.forEach(({word,emotionIndex})=>{
      if(line.includes(word)){
        const e=EMOTIONS[emotionIndex];
        const re=new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,`g`);
        highlighted=highlighted.replace(re,`<span class="hit" data-word="$1" style="--c:${e.color}">$1</span>`);
      }
    });
    return `<div class="poem-line"><span class="line-no">${i+1}</span><span>${highlighted}</span></div>`;
  }).join("")}</div>
  <div class="interpretation"><strong>문학적 해석</strong><br>${escapeHtml(poem.interpret)}</div>`;
}

function bindPoemLines() {
  document.querySelectorAll(".hit").forEach(hit=>hit.addEventListener("mouseenter",()=>{
    const word=hit.dataset.word;
    const found=lexTerms.find(t=>word.includes(t.word)||t.word.includes(word));
    if(found) showToast(`“${word}” → ${EMOTIONS[found.emotionIndex].name}`);
  }));
}

function renderBars(result) {
  if(!result.sum) return "";
  return `<div class="bar-list">${EMOTIONS.map((e,i)=>`
    <div class="bar-row"><span>${e.name}</span><div class="bar-track"><div class="bar-fill" style="width:${result.percentages[i]}%;background:${e.color}"></div></div><b>${result.percentages[i]}%</b></div>`).join("")}</div>`;
}

function renderDonut(result) {
  let cursor=0;
  const radius=72,cx=100,cy=100,circ=2*Math.PI*radius;
  const segments=result.percentages.map((p,i)=>{
    if(!p)return "";
    const dash=(p/100)*circ;
    const gap=circ-dash;
    const segment=`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${EMOTIONS[i].color}" stroke-width="16" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-(cursor/100)*circ}" transform="rotate(-90 ${cx} ${cy})"/>`;
    cursor+=p;
    return segment;
  }).join("");
  return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 200 200" role="img" aria-label="감정 도넛 차트">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="var(--panel-2)" stroke-width="16"/>${segments}
    <text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="15" font-weight="700">${dominant(result)?.name||""}</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle">지배 정서</text>
  </svg></div>`;
}

function renderRadar(result) {
  const cx=150,cy=145,r=105;
  const axes=EMOTIONS.map((e,i)=>{
    const angle=-Math.PI/2+i*Math.PI*2/EMOTIONS.length;
    return {x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle),name:e.name,color:e.color};
  });
  const grid=[.25,.5,.75,1].map(level=>`<polygon points="${axes.map(a=>`${cx+(a.x-cx)*level},${cy+(a.y-cy)*level}`).join(" ")}" fill="none" stroke="var(--line)"/>`).join("");
  const points=result.percentages.map((p,i)=>{
    const level=p/Math.max(100,Math.max(...result.percentages));
    return `${cx+(axes[i].x-cx)*level},${cy+(axes[i].y-cy)*level}`;
  }).join(" ");
  const labels=axes.map(a=>`<text x="${a.x}" y="${a.y+(a.y<cy?-8:a.y>cy?14:4)}" text-anchor="middle">${a.name}</text>`).join("");
  return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 300 290" role="img" aria-label="감정 레이더 차트">${grid}${labels}<polygon points="${points}" fill="#7771ff33" stroke="#7771ff" stroke-width="2"/></svg></div>`;
}

function renderLineChart(poem) {
  const lines=poem.text.split(/\n+/).filter(Boolean);
  const series=EMOTIONS.map(()=>[]);
  lines.forEach(line=>{
    const r=analyzeText(line);
    r.percentages.forEach((p,i)=>series[i].push(p));
  });
  const w=620,h=190,pad=24;
  let paths="";
  series.forEach((values,i)=>{
    if(!values.some(v=>v>0))return;
    const pts=values.map((v,j)=>`${pad+j*(w-pad*2)/Math.max(1,values.length-1)},${h-pad-v*(h-pad*2)/100}`).join(" ");
    paths+=`<polyline fill="none" stroke="${EMOTIONS[i].color}" stroke-width="2" points="${pts}"/>`;
  });
  return `<svg class="chart-svg line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="행별 감정 변화 그래프">
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="var(--line)"/>
    ${[25,50,75].map(v=>`<line x1="${pad}" y1="${h-pad-v*(h-pad*2)/100}" x2="${w-pad}" y2="${h-pad-v*(h-pad*2)/100}" stroke="var(--line)" stroke-dasharray="3 5"/>`).join("")}${paths}
  </svg><div class="legend">${EMOTIONS.filter((e,i)=>series[i].some(v=>v>0)).map(e=>`<span><i style="background:${e.color}"></i>${e.name}</span>`).join("")}</div>`;
}

function renderFlow(poem,result) {
  const dom=dominant(result);
  const evidence=result.evidence.find((x,i)=>EMOTIONS[i]===dom)||[];
  return `<div class="flow-diagram">
    <div><small>핵심 시어</small><br><b>${evidence.slice(0,3).join(", ")||"없음"}</b></div>
    <div class="arrow">→</div>
    <div><small>감정 범주</small><br><b style="color:${dom?.color||"var(--muted)"}">${dom?.name||"근거 부족"}</b></div>
    <div class="arrow">→</div>
    <div><small>문학적 주제</small><br><b>${escapeHtml(poem.theme)}</b></div>
  </div>`;
}

function renderRecommendations(poem) {
  const target=poemProfile(poem);
  const ranked=POEMS.filter(p=>p.id!==poem.id).map(p=>({p,score:cosine(target,poemProfile(p))}))
    .sort((a,b)=>b.score-a.score).slice(0,3);
  return `<div class="recommend">${ranked.map(({p,score})=>`
    <button data-rec="${p.id}"><b>${(score*100).toFixed(1)}%</b><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.author)} · ${p.year}</small></button>`).join("")}</div>`;
}

function renderCompare() {
  document.querySelector("#compareView").innerHTML=`
    <section class="grid-2">
      <article class="card card-inner">
        <div class="card-title"><h2>전체 작품 감정 히트맵</h2><small>행: 작품 / 열: 감정</small></div>
        <div class="heatmap-wrap">${renderHeatmap()}</div>
      </article>
      <article class="card card-inner">
        <div class="card-title"><h2>PCA 감성 지도</h2><small>8차원 감정 벡터의 2차원 투영</small></div>
        ${renderPCA()}
      </article>
    </section>
    <section class="card card-inner">
      <div class="card-title"><h2>감정 가중치 비교</h2><small>분석 결과를 즉시 재계산</small></div>
      ${renderWeightControls()}
      <div id="weightResult"></div>
    </section>
  `;
  bindWeightControls();
}

function renderHeatmap() {
  const rows=POEMS.map(p=>{
    const result=analyzeText(p.text);
    return `<tr><td>${escapeHtml(p.title)}</td>${result.percentages.map((v,i)=>`<td style="background:${EMOTIONS[i].color}${Math.round(35+v*1.9).toString(16).padStart(2,"0")}" title="${EMOTIONS[i].name} ${v}%">${v}</td>`).join("")}</tr>`;
  }).join("");
  return `<table class="heatmap"><thead><tr><th>작품</th>${EMOTIONS.map(e=>`<th>${e.name}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderPCA() {
  const vectors=POEMS.map(p=>poemProfile(p));
  const means=EMOTIONS.map((_,j)=>vectors.reduce((a,v)=>a+v[j],0)/vectors.length);
  const centered=vectors.map(v=>v.map((x,j)=>x-means[j]));
  const covariance=EMOTIONS.map((_,i)=>EMOTIONS.map((__,j)=>
    centered.reduce((sum,v)=>sum+v[i]*v[j],0)/Math.max(1,vectors.length-1)));
  const [pc1,pc2]=topEigenvectors(covariance);
  const coords=vectors.map((v,i)=>({x:dot(centered[i],pc1),y:dot(centered[i],pc2),p:POEMS[i]}));
  const xs=coords.map(c=>c.x),ys=coords.map(c=>c.y);
  const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const w=520,h=320,pad=32;
  const points=coords.map(c=>{
    const x=pad+(c.x-minx)/(maxx-minx||1)*(w-pad*2);
    const y=h-pad-(c.y-miny)/(maxy-miny||1)*(h-pad*2);
    const e=EMOTIONS.find(e=>e.name===c.p.emotion);
    return `<g data-pca="${c.p.id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="6" fill="${e?.color||"#7771ff"}"/><text x="${x+8}" y="${y+3}">${escapeHtml(c.p.title)}</text></g>`;
  }).join("");
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="PCA 감성 지도">
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="var(--line)"/>
    <line x1="${pad}" y1="${h-pad}" x2="${pad}" y2="${pad}" stroke="var(--line)"/>
    <text x="${w-pad}" y="${h-8}" text-anchor="end">PC1 →</text><text x="8" y="18">PC2 ↑</text>${points}
  </svg>`;
}

function dot(a,b){return a.reduce((sum,v,i)=>sum+v*b[i],0);}
function topEigenvectors(matrix) {
  function power(start) {
    let v=start.map(Number);
    for(let n=0;n<30;n++){
      v=matrix.map((row,i)=>row.reduce((s,x,j)=>s+x*v[j],0));
      const mag=Math.sqrt(v.reduce((s,x)=>s+x*x,0)||1);
      v=v.map(x=>x/mag);
    }
    return v;
  }
  const pc1=power(matrix.map((_,i)=>i===0?1:0));
  const eigen=dot(pc1,matrix.map(row=>dot(row,pc1)));
  const residual=matrix.map((row,i)=>row.map((x,j)=>x-eigen*pc1[i]*pc1[j]));
  let pc2=power(matrix.map((_,i)=>i===1?1:0));
  pc2=pc2.map((x,i)=>x-dot(pc2,pc1)*pc1[i]);
  const mag=Math.sqrt(pc2.reduce((s,x)=>s+x*x,0)||1);
  pc2=pc2.map(x=>x/mag);
  return [pc1,pc2];
}

function renderWeightControls() {
  return `<div>${EMOTIONS.map(e=>`
    <div class="slider-row"><span>${e.name}</span><input type="range" min="0" max="3" step=".1" value="${weights[e.name]}" data-weight="${e.name}"><b data-value="${e.name}">${weights[e.name].toFixed(1)}</b></div>`).join("")}</div>
    <button class="primary" id="resetWeights">가중치 초기화</button>`;
}

function bindWeightControls() {
  document.querySelectorAll("[data-weight]").forEach(input=>{
    input.addEventListener("input",()=>{
      weights[input.dataset.weight]=Number(input.value);
      document.querySelector(`[data-value="${input.dataset.weight}"]`).textContent=Number(input.value).toFixed(1);
      updateWeightResult();
    });
  });
  document.querySelector("#resetWeights").addEventListener("click",()=>{
    weights=Object.fromEntries(EMOTIONS.map(e=>[e.name,1]));
    renderCompare(); document.querySelector("#compareView").hidden=false;
  });
  updateWeightResult();
}

function updateWeightResult() {
  const poem=POEMS.find(p=>p.id===selectedId)||POEMS[0];
  const original=analyzeText(poem.text);
  const adjusted=analyzeText(poem.text,weights);
  document.querySelector("#weightResult").innerHTML=`
    <div class="grid-2" style="margin-top:14px">
      <div><small>기본 지배 정서</small><h3>${dominant(original)?.name||"근거 부족"}</h3>${renderBars(original)}</div>
      <div><small>조정 지배 정서</small><h3 style="color:${dominant(adjusted)?.color||"var(--muted)"}">${dominant(adjusted)?.name||"근거 부족"}</h3>${renderBars(adjusted)}</div>
    </div>`;
}

function renderCustom() {
  document.querySelector("#customView").innerHTML=`
    <section class="grid-2">
      <article class="card card-inner custom-form">
        <div class="eyebrow">CUSTOM TEXT</div><div class="card-title"><h2>나만의 시 분석</h2></div>
        <p style="color:var(--muted)">입력한 글은 외부로 전송되지 않습니다.</p>
        <label for="customTitle">제목</label><input id="customTitle" maxlength="100" placeholder="제목을 입력하세요">
        <label for="customText">시 본문</label><textarea id="customText" maxlength="12000" placeholder="행을 나눠 시를 입력하세요."></textarea>
        <button class="primary" id="runCustom">감정 분석하기</button>
      </article>
      <article class="card card-inner" id="customPreview">
        <div class="card-title"><h2>분석 미리보기</h2><small>감정 사전 기반</small></div>
        <p style="color:var(--muted)">본문을 입력하고 분석을 실행하세요.</p>
      </article>
    </section>
  `;
  document.querySelector("#runCustom").addEventListener("click",runCustom);
}

function runCustom() {
  const text=document.querySelector("#customText").value.trim();
  const title=document.querySelector("#customTitle").value.trim()||"사용자 입력 시";
  if(!text){showToast("시 본문을 입력하세요.");return;}
  const result=analyzeText(text);
  const dom=dominant(result);
  const preview=document.querySelector("#customPreview");
  preview.innerHTML=`<div class="card-title"><h2>${escapeHtml(title)}</h2><small>${dom?dom.name:"근거 부족"}</small></div>
    ${result.sum?renderBars(result):`<p style="color:var(--muted)">검출된 감정 시어가 없어 비율을 계산하지 않았습니다.</p>`}
    ${renderCustomRecommendations(text,result)}
    <div class="art-grid" style="margin-top:14px"><canvas id="customArt" width="280" height="280"></canvas><div><b>감정 비율 디지털 아트</b><p style="color:var(--muted)">감정 비율을 중심의 원과 색 영역으로 변환합니다.</p></div></div>`;
  drawArt(document.querySelector("#customArt"),result);
}

function renderCustomRecommendations(text,result) {
  const ranked=POEMS.map(p=>({p,score:cosine(result.weighted,poemProfile(p))}))
    .sort((a,b)=>b.score-a.score).slice(0,3);
  return `<div class="card-title" style="margin-top:16px"><h3>유사 작품</h3></div><div class="recommend">${ranked.map(({p,score})=>`
    <button data-rec="${p.id}"><b>${(score*100).toFixed(1)}%</b><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.author)}</small></button>`).join("")}</div>`;
}

function drawArt(canvas,result) {
  if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--bg");ctx.fillRect(0,0,w,h);
  let start=-Math.PI/2;
  result.percentages.forEach((p,i)=>{
    if(!p)return;
    const angle=p/100*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,Math.min(w,h)*.41,start,start+angle);ctx.closePath();
    ctx.fillStyle=EMOTIONS[i].color;ctx.globalAlpha=.82;ctx.fill();
    start+=angle;
  });
  ctx.globalAlpha=1;ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.12,0,Math.PI*2);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--panel");ctx.fill();
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--text");ctx.textAlign="center";ctx.font="700 18px sans-serif";
  ctx.fillText(dominant(result)?.name||"근거 부족",cx,cy+6);
}

function renderArt(poem,result) {
  drawArt(document.querySelector("#artCanvas"),result);
}

function renderMethod() {
  document.querySelector("#methodView").innerHTML=`
    <section class="method-grid">
      <article class="card card-inner"><div class="card-title"><h2>감정 사전 분석</h2></div>
        <dl><dt>검출</dt><dd>각 행의 문자열에서 감정 시어를 중복 없이 탐색합니다.</dd><dt>가중치</dt><dd>범주별 시어 수에 사용자가 조정한 가중치를 곱합니다.</dd><dt>정규화</dt><dd>가중 합계를 기준으로 비율을 계산하고 가장 큰 잔여분을 사용해 합계 100%를 맞춥니다.</dd><dt>근거 부족</dt><dd>검출 시어가 없으면 지배 정서와 비율을 표시하지 않습니다.</dd></dl>
      </article>
      <article class="card card-inner"><div class="card-title"><h2>유사도와 PCA</h2></div>
        <dl><dt>코사인</dt><dd>8차원 감정 벡터의 방향 유사도를 0~1 범위로 계산합니다.</dd><dt>PCA</dt><dd>감정 벡터의 공분산 행렬에서 거듭제곱법으로 주성분 2개를 추정합니다.</dd><dt>검증 한계</dt><dd>프로그램 결과와 문학 해석의 차이는 시어 사전의 맥락 한계를 드러낼 수 있습니다.</dd></dl>
      </article>
      <article class="card card-inner"><div class="card-title"><h2>검증 사례 5개</h2></div>
        <ol style="margin:0;padding-left:18px;color:var(--muted)"><li>진달래꽃: 사전은 슬픔을 높게 잡지만 배려와 절제의 평온한 이별을 해석한다.</li><li>그날이 오면: 기쁨보다 저항과 희망의 공동체적 환희를 강조한다.</li><li>거울: 낮은 어휘 강도로도 분열과 성찰을 해석한다.</li><li>십자가: 고통을 낮은 비중으로도 신앙적 결단으로 해석한다.</li><li>빼앗긴 들에도 봄은 오는가: 봄 시어와 저항어가 대비되어 단일 기쁨 분류를 거부한다.</li></ol>
      </article>
      <article class="card card-inner"><div class="card-title"><h2>저작권 및 출처 원칙</h2></div>
        <p style="color:var(--muted)">수록 시인은 사망년 기준 1962년 이전이다. 원문과 출처는 위키문헌 또는 시대 문헌을 연결한다. 공개 원문 확인이 불충분한 항목은 링크 대조를 권장하도록 README에 표시한다.</p>
      </article>
    </section>
  `;
}

function showToast(message) {
  const toast=document.querySelector("#toast");
  toast.textContent=message;toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),1800);
}

function bindNavigation() {
  document.querySelectorAll(".tabs button").forEach(button=>{
    button.addEventListener("click",()=>{
      document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".view").forEach(v=>v.hidden=true);
      const view=document.querySelector(`#${button.dataset.view}View`);
      view.hidden=false;
      if(button.dataset.view==="compare")renderCompare();
      if(button.dataset.view==="custom")renderCustom();
      if(button.dataset.view==="method")renderMethod();
    });
  });
  document.querySelector("#themeButton").addEventListener("click",()=>{
    document.body.classList.toggle("light");
  });
  document.querySelector("#brandButton").addEventListener("click",()=>{
    selectedId=1;document.querySelector("#searchInput").value="";document.querySelector("#emotionFilter").value="";
    renderList();renderWork();
  });
  document.querySelector("#searchInput").addEventListener("input",renderList);
  document.querySelector("#emotionFilter").addEventListener("change",renderList);
  document.querySelector("#workView").addEventListener("click",event=>{
    const button=event.target.closest("[data-rec]");
    if(button){selectedId=Number(button.dataset.rec);renderList();renderWork();}
  });
  document.querySelector("#customView").addEventListener("click",event=>{
    const button=event.target.closest("[data-rec]");
    if(button){selectedId=Number(button.dataset.rec);renderList();renderWork();document.querySelector('[data-view="work"]').click();}
  });
}

function init() {
  const filter=document.querySelector("#emotionFilter");
  filter.insertAdjacentHTML("beforeend",EMOTIONS.map(e=>`<option value="${e.name}">${e.name}</option>`).join(""));
  renderList();renderWork();renderCompare();renderCustom();renderMethod();bindNavigation();
}

init();
