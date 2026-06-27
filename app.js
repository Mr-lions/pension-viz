(() => {
  'use strict';
  const D = window.PENSION_DATA;
  const C = {ink:'#5C4A3D',body:'#6F6258',muted:'#9A8F86',line:'#E9E1D8',accent:'#FD8200',red:'#E78768',gold:'#F0C95A',bar:'#F2BE86',soft:'#FFE9C6',brick:'#B33A24',blue:'#617C88',bg:'#FAF8F5'};
  const font = '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif';
  const charts = new Map();
  const plotConfig = {responsive:true,displayModeBar:false,displaylogo:false,scrollZoom:false};
  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const fmt = (v,d=0) => Number(v).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
  const yuan = (v,d=0) => `${fmt(v,d)}元`;
  const yi = v => `${fmt(v/10000,2)}亿`;
  const plotFinalStates = new Map();
  const reducedMotion = () => document.body.classList.contains('motion-off')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const commonLayout = (extra={}) => ({
    font:{family:font,color:C.body,size:12},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
    margin:{l:58,r:48,t:30,b:55},hoverlabel:{bgcolor:'#2e2925',bordercolor:'#2e2925',font:{family:font,color:'#fff'}},
    xaxis:{gridcolor:'rgba(0,0,0,0)',linecolor:C.line,tickfont:{color:C.muted},zeroline:false},
    yaxis:{gridcolor:C.line,gridwidth:1,griddash:'dot',tickfont:{color:C.muted},zeroline:false},
    legend:{orientation:'h',x:.5,xanchor:'center',y:1.12,font:{size:11,color:C.body}},
    ...extra
  });
  function safePlot(id,traces,layout){
    const el=document.getElementById(id); if(!el || !window.Plotly) return;
    const animated=id!=='populationChart'&&window.gsap&&window.ScrollTrigger&&!reducedMotion();
    const animatable=[];
    const initial=traces.map((trace,i)=>{
      if(!animated||!['bar','scatter'].includes(trace.type))return trace;
      if(trace.type==='scatter'&&!String(trace.mode||'').includes('lines'))return trace;
      animatable.push(i);
      if(trace.type==='bar'&&trace.orientation==='h')return{...trace,x:(trace.x||[]).map(()=>0)};
      return{...trace,y:(trace.y||[]).map(()=>0)};
    });
    plotFinalStates.set(id,{traces,layout});
    return Plotly.newPlot(el,initial,layout,plotConfig).then(()=>{
      charts.set(id,el);
      if(animated&&animatable.length){
        const trigger=el.closest('.chart-card,.dual-view,.income-drill')||el;
        ScrollTrigger.create({trigger,start:'top 84%',once:true,onEnter:()=>{
          if(reducedMotion()){Plotly.react(el,traces,layout,plotConfig);return}
          const data=animatable.map(i=>traces[i].type==='bar'&&traces[i].orientation==='h'?{x:traces[i].x}:{y:traces[i].y});
          Plotly.animate(el,{data,traces:animatable},{transition:{duration:1250,easing:'cubic-in-out'},frame:{duration:1250,redraw:false}});
        }});
      }
      return el;
    });
  }
  function finishPlotAnimations(){plotFinalStates.forEach((state,id)=>{const el=charts.get(id);if(el)Plotly.react(el,state.traces,state.layout,plotConfig)})}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
  function animateNumber(el,target,duration=1800,decimals=0){
    const start=performance.now();
    function tick(now){const p=Math.min((now-start)/duration,1);const e=1-Math.pow(1-p,3);el.textContent=(target*e).toFixed(decimals);if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick);
  }

  function initReveal(){
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');if(e.target.classList.contains('timeline-item')){}obs.unobserve(e.target)}}),{threshold:.1});
    $$('.reveal').forEach(el=>obs.observe(el));
    const numObs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){const el=e.target;animateNumber(el,parseFloat(el.dataset.target),1800,parseInt(el.dataset.decimals||'0'));numObs.unobserve(el)}}),{threshold:.7});
    $$('.roll-number').forEach(el=>numObs.observe(el));
  }
  function initHeroQuestions(){
    const questions=$('.hero-intro .hero-questions');
    if(!questions)return;
    questions.classList.add('questions-enter');
    const show=()=>questions.classList.add('visible');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){show();return}
    const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      show();
      obs.disconnect();
    }),{threshold:.35});
    obs.observe(questions);
  }
  function initScrollUI(){
    const progress=$('#scrollProgress');const dots=$$('.chapter-dots a');const sections=dots.map(a=>document.querySelector(a.getAttribute('href')));
    const update=()=>{const h=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${Math.max(0,Math.min(100,scrollY/h*100))}%`;let active=0;sections.forEach((s,i)=>{if(s && s.getBoundingClientRect().top<innerHeight*.48)active=i});dots.forEach((d,i)=>d.classList.toggle('active',i===active))};
    addEventListener('scroll',update,{passive:true});update();
    $('#backTop')?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
    $('#motionToggle')?.addEventListener('click',e=>{document.body.classList.toggle('motion-off');const off=document.body.classList.contains('motion-off');e.currentTarget.textContent=off?'静态':'动效';if(off){window.gsap?.globalTimeline.progress(1);window.ScrollTrigger?.getAll().forEach(x=>x.animation?.progress(1));finishPlotAnimations()}toast(off?'已减少页面动效':'已恢复页面动效')});
  }

  function initPopulation(){
    const p=D.population;
    const finalTraces=[
      {type:'bar',name:'柱形：60岁及以上人口',x:p.years,y:p.pop60,marker:{color:'#5B7FA6'},hovertemplate:'%{x}年<br>60岁及以上：%{y:,.0f}万人<extra></extra>'},
      {type:'scatter',mode:'lines+markers',name:'折线：占总人口比重',x:p.years,y:p.share60,yaxis:'y2',line:{color:C.accent,width:3},marker:{size:7,color:'#fff',line:{color:C.accent,width:2}},hovertemplate:'%{x}年<br>占总人口比重：%{y:.2f}%<extra></extra>'}
    ];
    const initialTraces=finalTraces.map((trace,i)=>({...trace,y:i===0?trace.y.map(()=>0):trace.y}));
    const layout=commonLayout({hovermode:'x unified',xaxis:{...commonLayout().xaxis,tick0:2007,dtick:2,range:[2005.5,2025.5]},yaxis:{...commonLayout().yaxis,title:'人数（万人）',range:[0,36000],tick0:0,dtick:6000},yaxis2:{title:'占总人口比重（%）',overlaying:'y',side:'right',range:[0,25],tick0:0,dtick:5,showgrid:false,tickfont:{color:C.muted}}});
    const plotReady=safePlot('populationChart',initialTraces,layout).then(el=>{
      el.classList.add('population-line-pending');
      const line=el.querySelector('.scatterlayer .trace.scatter .js-line');
      const points=[...el.querySelectorAll('.scatterlayer .trace.scatter .points .point')];
      if(line){const length=line.getTotalLength();line.style.strokeDasharray=`${length} ${length}`;line.style.strokeDashoffset=length}
      points.forEach(point=>point.style.opacity='0');
      return el;
    });
    const module=$('.pop-grid .chart-card');
    if(module&&plotReady){
      const play=()=>{
        plotReady.then(el=>{
          const reduced=reducedMotion();
          if(reduced){el.classList.remove('population-line-pending');Plotly.react(el,finalTraces,layout,plotConfig);return}
          Plotly.animate(el,{data:[{y:p.pop60},{y:p.share60}],traces:[0,1]},{transition:{duration:1100,easing:'cubic-in-out'},frame:{duration:1100,redraw:false}}).then(()=>{
            const line=el.querySelector('.scatterlayer .trace.scatter .js-line');
            const points=[...el.querySelectorAll('.scatterlayer .trace.scatter .points .point')];
            if(line){const length=line.getTotalLength();line.style.strokeDasharray=`${length} ${length}`;line.style.strokeDashoffset=length;line.style.transition='none'}
            points.forEach(point=>{point.style.opacity='0';point.style.transition='none'});
            el.classList.remove('population-line-pending');
            requestAnimationFrame(()=>requestAnimationFrame(()=>{
              if(line){line.style.transition='stroke-dashoffset 1450ms cubic-bezier(.22,1,.36,1)';line.style.strokeDashoffset='0'}
              points.forEach((point,i)=>{point.style.transition='opacity .22s ease';point.style.transitionDelay=`${Math.round(i*67)}ms`;point.style.opacity='1'});
            }));
          });
        });
      };
      if(window.ScrollTrigger)ScrollTrigger.create({trigger:module,start:'top 84%',once:true,onEnter:play});
      else{const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){play();obs.disconnect()}}),{threshold:.28});obs.observe(module)}
    }
    const live=$('#populationLive');
    setTimeout(()=>{const c=$('#populationChart');if(c&&window.Plotly)Plotly.Plots.resize(c)},150);
    const el=$('#populationChart');el?.on('plotly_hover',ev=>{const year=ev.points[0].x;const i=p.years.indexOf(Number(year));if(i<0||!live)return;live.innerHTML=`<span>当前年份</span><strong>${year}</strong><div><b>${fmt(p.pop60[i]/10000,2)}亿</b><small>60岁及以上</small></div><div><b>${fmt(p.share60[i],2)}%</b><small>占总人口</small></div>`});
  }

  function renderDots(age='60+'){
    const v=D.urbanRural[age],u=Math.round(v.urban),r=Math.round(v.rural);
    const make=(id,n)=>{const el=$(id);el.innerHTML='';for(let i=0;i<100;i++){const dot=document.createElement('i');if(i<n)dot.classList.add('active');dot.style.transitionDelay=`${Math.min(i,30)*10}ms`;el.appendChild(dot)}};
    make('#urbanDots',u);make('#ruralDots',r);$('#urbanShare').textContent=`${v.urban.toFixed(2)}%`;$('#ruralShare').textContent=`${v.rural.toFixed(2)}%`;$('#urbanCount').textContent=u;$('#ruralCount').textContent=r;$('#shareGap').textContent=(v.rural-v.urban).toFixed(2);
  }
  function initPictogram(){renderDots();$$('.segmented button').forEach(btn=>btn.addEventListener('click',()=>{$$('.segmented button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderDots(btn.dataset.age)}));}
  function initDependency(){
    const d=D.dependency;safePlot('dependencyChart',[{type:'scatter',mode:'lines+markers',x:d.years,y:d.ratio,fill:'tozeroy',fillcolor:'rgba(231,135,104,.12)',line:{color:C.red,width:4},marker:{size:d.years.map(y=>y===2006||y===2024?10:5),color:d.years.map(y=>y===2024?C.brick:C.red)},hovertemplate:'%{x}年<br>老年抚养比：%{y:.1f}%<extra></extra>'}],commonLayout({showlegend:false,xaxis:{...commonLayout().xaxis,dtick:3},yaxis:{...commonLayout().yaxis,title:'老年抚养比（%）'},annotations:[{x:2006,y:11,text:'11.0%',showarrow:true,arrowcolor:C.muted},{x:2024,y:22.8,text:'22.8%',showarrow:true,arrowcolor:C.brick,font:{color:C.brick}}]}));
    $$('.support-icons').forEach(el=>{for(let i=0;i<Number(el.dataset.count);i++)el.appendChild(document.createElement('i'))});
  }

  function initBurden(){
    const d=D.dependency,slider=$('#burdenSlider');if(!slider)return;
    const person='<svg class="person" viewBox="0 0 24 30"><circle cx="12" cy="6" r="5.4"/><path d="M3 30c0-6.4 4-10.8 9-10.8s9 4.4 9 10.8z"/></svg>';
    function render(i){
      const year=d.years[i],ratio=d.ratio[i],support=100/ratio,n=Math.max(1,Math.round(support));
      $('#burdenYear').textContent=year;
      $('#burdenRatioText').textContent=ratio.toFixed(1);
      $('#burdenPct').textContent=`${ratio.toFixed(1)}%`;
      $('#burdenSupport').textContent=support.toFixed(1);
      $('#burdenWorkers').innerHTML=person.repeat(n);
    }
    slider.max=d.years.length-1;slider.value=d.years.length-1;
    slider.addEventListener('input',()=>render(+slider.value));
    render(+slider.value);
  }
  function initFlow(){
    $$('[data-flow]').forEach(btn=>btn.addEventListener('click',()=>{$$('.flow-path').forEach(p=>p.classList.toggle('active',p.dataset.path===btn.dataset.flow));document.querySelector(`[data-path="${btn.dataset.flow}"]`)?.scrollIntoView({behavior:'smooth',block:'center'})}));
    $$('.flow-nodes button').forEach(btn=>btn.addEventListener('click',()=>{$$('.flow-nodes button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');$('#flowDetail').textContent=btn.dataset.detail}));
    const inputs=['base','contrib','subsidy','years'];
    function calc(){const base=+$('#baseInput').value,contrib=+$('#contribInput').value,sub=+$('#subsidyInput').value,yrs=+$('#yearsInput').value;$('#baseOut').textContent=`${base}元`;$('#contribOut').textContent=`${contrib}元`;$('#subsidyOut').textContent=`${sub}元`;$('#yearsOut').textContent=`${yrs}年`;const acc=(contrib+sub)*yrs/139;$('#calcBase').textContent=base.toFixed(2);$('#calcAccount').textContent=acc.toFixed(2);$('#calcTotal').textContent=(base+acc).toFixed(2)}
    inputs.forEach(id=>$(`#${id}Input`).addEventListener('input',calc));calc();
  }

  function initCoverage(){
    const d=D.coverage;
    const traces=[
      {type:'scatter',mode:'lines+markers',name:'参保人数',x:d.years,y:d.insured,line:{color:C.ink,width:3},marker:{size:6},hovertemplate:'%{x}年<br>参保：%{y:,.0f}万人<extra></extra>'},
      {type:'scatter',mode:'lines+markers',name:'领取待遇人数',x:d.years,y:d.recipients,line:{color:C.red,width:3},marker:{size:6},hovertemplate:'%{x}年<br>领取待遇：%{y:,.0f}万人<extra></extra>'},
      {type:'bar',name:'基金收入',x:d.years,y:d.income,yaxis:'y2',marker:{color:'rgba(242,190,134,.76)'},hovertemplate:'%{x}年<br>基金收入：%{y:,.0f}亿元<extra></extra>'},
      {type:'bar',name:'基金支出',x:d.years,y:d.expense,yaxis:'y2',marker:{color:'rgba(231,135,104,.75)'},hovertemplate:'%{x}年<br>基金支出：%{y:,.0f}亿元<extra></extra>'}
    ];
    safePlot('coverageChart',traces,commonLayout({barmode:'group',hovermode:'x unified',yaxis:{...commonLayout().yaxis,title:{text:'人数（万人）',font:{color:C.muted,size:12}},range:[0,60000],automargin:true},yaxis2:{title:{text:'基金收支（亿元）',font:{color:C.muted,size:12}},overlaying:'y',side:'right',range:[0,9000],showgrid:false,automargin:true,tickfont:{color:C.muted}},xaxis:{...commonLayout().xaxis,dtick:1}}));
    setTimeout(()=>{const c=$('#coverageChart');if(c&&window.Plotly)Plotly.Plots.resize(c)},160);
    const s=$('#coverageSlider');function update(){const i=+s.value,y=d.years[i];$('#coverageYear').textContent=y;$('#insuredKpi').textContent=yi(d.insured[i]);$('#recipientKpi').textContent=yi(d.recipients[i]);$('#benefitKpi').textContent=`${d.benefit[i].toFixed(2)}元`;if(charts.get('coverageChart'))Plotly.relayout('coverageChart',{'shapes':[ {type:'line',x0:y,x1:y,y0:0,y1:1,yref:'paper',line:{color:C.accent,width:2,dash:'dot'}}]})}s.addEventListener('input',update);update();
  }

  function initGap(){
    const d=D.systemGap,s=$('#gapSlider');function update(){const i=+s.value,y=d.years[i],e=d.employee[i],r=d.resident[i],m=e/r;$('#gapYear').textContent=y;$('#employeeValue').textContent=fmt(e,0);$('#residentValue').textContent=fmt(r,0);$('#gapMultiple').textContent=m.toFixed(1);$('#employeeWater').style.height=`${Math.min(95,e/4100*100)}%`;$('#residentWater').style.height=`${Math.max(5,r/4100*100)}%`;$('#gapConclusion').textContent=`${y}年，两套制度的月均基金支出估算相差约${m.toFixed(1)}倍。`}s.addEventListener('input',update);update();
  }

  const tilePos={
    '新疆':[1,3,2],'西藏':[2,5,2],'青海':[4,4,1],'甘肃':[5,3,1],'内蒙古':[6,2,2],'黑龙江':[9,1,1],'吉林':[9,2,1],'辽宁':[8,2,1],'北京':[8,3,1],'天津':[9,3,1],'河北':[7,3,1],'山西':[6,3,1],'宁夏':[5,4,1],'陕西':[6,4,1],'山东':[8,4,1],'河南':[7,4,1],'江苏':[9,5,1],'安徽':[8,5,1],'湖北':[7,5,1],'四川':[5,5,1],'重庆':[6,5,1],'浙江':[9,6,1],'江西':[8,6,1],'湖南':[7,6,1],'贵州':[6,6,1],'云南':[5,7,1],'福建':[9,7,1],'广东':[8,7,1],'广西':[7,7,1],'海南':[8,8,1],'上海':[10,5,1]
  };
  function tierClass(t){return t==='顶尖档'?'tier-top':t==='较高水平档'?'tier-high':t==='全国主流档'?'tier-main':'tier-base'}
  function initProvince(){
    const sorted=[...D.provinces].sort((a,b)=>b.value-a.value);
    let selected='上海',tier='全部';
    const base=Number(D.nationalBaseStandard||163);
    const tierColor={'顶尖档':'#9f3f2f','较高水平档':'#dc724f','全国主流档':'#d7a15c','国家兜底档':'#b7aa99'};
    let refresh=()=>{};
    function select(name){
      selected=name;
      const p=D.provinces.find(x=>x.name===name),rank=sorted.findIndex(x=>x.name===name)+1;
      const diff=p.value-base;
      const diffText=diff>0?`+${fmt(diff)}元`:diff<0?`${fmt(diff)}元`:'持平';
      const compareClass=diff>0?'positive':diff<0?'negative':'equal';
      const policies=(p.policyHighlights||[]);
      const policyHtml=policies.length
        ? `<ul>${policies.map(x=>`<li>${x}</li>`).join('')}</ul>`
        : `<p class="policy-empty">所附政策表未单列该地区的补充条款，具体以当地最新政策文件为准。</p>`;
      $('#provinceDetail').innerHTML=`
        <span class="badge">2025省级参考值 · ${p.tier}</span>
        <h3>${p.name}</h3>
        <strong>${fmt(p.value)}<small>元/月</small></strong>
        <p class="province-note">${p.note}</p>
        <div class="national-compare ${compareClass}">
          <span>与全国基础标准（${fmt(base)}元/月）相比</span>
          <b>${diffText}</b>
        </div>
        <div class="rank-line"><span>31省份排名</span><b>第${rank}位</b></div>
        <div class="policy-explain"><h4>地方政策说明</h4>${policyHtml}</div>`;
      refresh();
    }
    $$('.tier-legend button').forEach(btn=>btn.addEventListener('click',()=>{$$('.tier-legend button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');tier=btn.dataset.tier;refresh()}));
    $('#provinceSearch').addEventListener('input',()=>{const q=$('#provinceSearch').value.trim();if(q){const p=D.provinces.find(x=>x.name.includes(q));if(p){select(p.name);return}}refresh()});
    const el=$('#provinceMap'),geo=window.CHINA_GEO;
    if(!el||!window.echarts||!geo){select(selected);return}
    const chart=echarts.init(el);
    {
      echarts.registerMap('china',geo);
      const byFull={};geo.features.forEach(f=>{const n=f.properties.name,p=D.provinces.find(x=>n.startsWith(x.name));if(p)byFull[n]=p});
      function dataArr(){return geo.features.map(f=>{const n=f.properties.name,p=byFull[n];
        if(!p)return{name:n,value:NaN,itemStyle:{areaColor:'#e9e0d6',borderColor:'#fff',borderWidth:.6}};
        const dim=(tier!=='全部'&&p.tier!==tier),sel=(p.name===selected);
        return{name:n,value:p.value,itemStyle:{areaColor:dim?'#e4ddd4':tierColor[p.tier],opacity:dim?.55:1,borderColor:sel?'#2e2925':'#fff',borderWidth:sel?2.4:.6}}})}
      chart.setOption({
        animation:true,animationDuration:1300,animationEasing:'cubicOut',animationDelay:i=>Math.min(i*24,620),
        tooltip:{trigger:'item',confine:true,backgroundColor:'#2e2925',borderColor:'#2e2925',padding:[10,14],textStyle:{color:'#fff',fontSize:13},extraCssText:'max-width:260px;white-space:normal;box-shadow:0 12px 30px rgba(0,0,0,.28)',
          formatter:pp=>{const p=byFull[pp.name];if(!p)return `${pp.name}<br/><span style="color:#c5b8ae">暂无数据</span>`;let h=`<b style="font-size:14px">${p.name}</b><br/>基础养老金：<b>${fmt(p.value)}</b> 元/月<br/><span style="color:#ffd7a7">${p.tier}</span>`;if(p.regionNote)h+=`<div style="margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.18);color:#dcc9b8;font-size:11.5px;line-height:1.65">⚠ 地区差异提示：${p.regionNote}</div>`;return h}},
        series:[{type:'map',map:'china',roam:'scale',scaleLimit:{min:1,max:6},layoutCenter:['50%','52%'],layoutSize:'96%',
          label:{show:false},
          emphasis:{label:{show:true,color:'#2e2925',fontSize:12,fontWeight:600},itemStyle:{areaColor:'#ffd7a7'}},
          select:{disabled:true},
          data:dataArr()}]
      });
      refresh=()=>chart.setOption({series:[{data:dataArr()}]});
      chart.on('click',pp=>{const p=byFull[pp.name];if(p)select(p.name)});
      addEventListener('resize',()=>chart.resize());
      select(selected);
    }
  }

  function initCost(){
    const d=D.livingCost,gap=d.ruralConsumption.map((v,i)=>+(v-d.pension[i]).toFixed(2));
    const traces=[
      {type:'bar',name:'养老金月均支出估算',x:d.years,y:d.pension,marker:{color:C.red},customdata:d.ruralConsumption.map((v,i)=>[v,gap[i],d.pension[i]/v*100]),hovertemplate:'%{x}年<br>待遇估算：%{y:.2f}元<br>农村月均消费：%{customdata[0]:.2f}元<br>缺口：%{customdata[1]:.2f}元<br>覆盖率：%{customdata[2]:.2f}%<extra></extra>'},
      {type:'bar',name:'月均生活缺口',x:d.years,y:gap,marker:{color:C.soft},hoverinfo:'skip'},
      {type:'scatter',mode:'lines+markers',name:'全国基础养老金最低标准',x:d.years,y:d.baseMinimum,line:{color:C.accent,width:3,dash:'dot'},marker:{size:5},hovertemplate:'%{x}年<br>最低标准：%{y:.0f}元<extra></extra>'}
    ];
    safePlot('costChart',traces,commonLayout({barmode:'stack',hovermode:'x unified',yaxis:{...commonLayout().yaxis,title:'元/月'},xaxis:{...commonLayout().xaxis,dtick:1}}));
    const el=$('#costChart');el?.on('plotly_hover',ev=>{const year=Number(ev.points[0].x),i=d.years.indexOf(year);if(i<0)return;const rate=d.pension[i]/d.ruralConsumption[i]*100;$('#costLive').innerHTML=`<span>${year}年</span><strong>${rate.toFixed(2)}%</strong><small>养老金可覆盖的农村月均消费支出</small><div><b>${fmt(d.pension[i],2)}元</b><small>月均待遇估算</small></div><div><b>${fmt(gap[i],2)}元</b><small>月均缺口</small></div>`});
    let view='coverage';
    function drawView(){const y=view==='coverage'?d.pension.map((v,i)=>+(v/d.ruralConsumption[i]*100).toFixed(2)):gap;const trace=view==='coverage'?{type:'scatter',mode:'lines+markers',x:d.years,y,fill:'tozeroy',fillcolor:'rgba(231,135,104,.12)',line:{color:C.red,width:4},marker:{size:7},hovertemplate:'%{x}年<br>覆盖率：%{y:.2f}%<extra></extra>'}:{type:'bar',x:d.years,y,marker:{color:C.bar},hovertemplate:'%{x}年<br>月均缺口：%{y:.2f}元<extra></extra>'};const shapes=view==='coverage'?[{type:'line',x0:2014,x1:2024,y0:14.29,y1:14.29,line:{color:C.gold,width:2,dash:'dot'}}]:[{type:'line',x0:2014,x1:2024,y0:1000,y1:1000,line:{color:C.gold,width:2,dash:'dot'}}];safePlot('coverageRateChart',[trace],commonLayout({showlegend:false,shapes,yaxis:{...commonLayout().yaxis,title:view==='coverage'?'覆盖率（%）':'元/月'},xaxis:{...commonLayout().xaxis,dtick:1}}));setTimeout(()=>{$('#coverageRateChart')?.on('plotly_hover',ev=>{const yr=Number(ev.points[0].x),i=d.years.indexOf(yr);$('#coverageNarrative').textContent=view==='coverage'?`${yr}年，一笔养老金约能覆盖${(d.pension[i]/d.ruralConsumption[i]*100).toFixed(2)}%的农村月均消费支出。`:`${yr}年，养老金与农村月均消费支出之间仍有${gap[i].toFixed(2)}元缺口。`})},0)}
    $$('.view-tabs button').forEach(btn=>btn.addEventListener('click',()=>{$$('.view-tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');view=btn.dataset.costView;drawView()}));drawView();
  }

  function initBasket(){
    const wrap=$('#basketItems'),selected=new Set(),budget=245.86;
    D.basket.forEach(item=>{const b=document.createElement('button');b.className='basket-item';b.dataset.id=item.id;b.innerHTML=`<span class="ico">${item.icon}</span><span><b>${item.name}</b><small>${item.note}</small></span><strong>${item.price}元</strong>`;b.addEventListener('click',()=>{selected.has(item.id)?selected.delete(item.id):selected.add(item.id);b.classList.toggle('active',selected.has(item.id));update()});wrap.appendChild(b)});
    function update(){const spent=D.basket.filter(x=>selected.has(x.id)).reduce((s,x)=>s+x.price,0),remain=budget-spent;$('#basketSpent').textContent=`${spent.toFixed(2)}元`;$('#basketRemaining').textContent=`${remain.toFixed(2)}元`;$('#basketMeter').style.width=`${Math.min(100,spent/budget*100)}%`;const status=!selected.size?'尚未选择':remain>=0?'尚未超支':'已超支';$('#basketStatus').textContent=status;$('#basketStatus').style.color=remain<0?C.brick:C.ink}
    $('#basketReset').addEventListener('click',()=>{selected.clear();$$('.basket-item').forEach(x=>x.classList.remove('active'));update()});update();
  }

  
function initConsumptionIncome(){
    const c=[...D.consumption].sort((a,b)=>b.value-a.value);
    const consumptionColors=[C.red,C.bar,C.gold,'#c9a67d','#d7bfa7','#bcae9f','#d8cfc7','#d9d2cb','#eadfd5'];
    const y=c.map(x=>x.name).reverse();
    const x=c.map(x=>x.value).reverse();
    const defs=c.map(x=>x.definition).reverse();
    const cols=[...consumptionColors].slice(0,c.length).reverse();
    safePlot('consumptionChart',[{
      type:'bar',orientation:'h',y,x,
      marker:{color:cols,line:{color:'#ffffff',width:1.5}},
      text:x.map(v=>`${v.toFixed(2)}%`),textposition:'outside',cliponaxis:false,
      customdata:defs,
      hovertemplate:'<b>%{y}</b><br>占比：%{x:.2f}%<br>%{customdata}<extra></extra>'
    }],commonLayout({
      showlegend:false,
      margin:{l:96,r:64,t:6,b:18},
      xaxis:{...commonLayout().xaxis,title:'消费占比（%）',range:[0,65],tick0:0,dtick:10,gridcolor:'rgba(92,74,61,.08)'},
      yaxis:{...commonLayout().yaxis,showgrid:false,automargin:true,categoryorder:'array',categoryarray:y},
      bargap:.28
    }));
    function setConsumptionDetail(item){
      if(!item) return;
      const detail=$('#consumptionDetail');
      const kicker=$('.wallet-kicker strong');
      detail.innerHTML=`<b>${item.name} ${item.value.toFixed(2)}%</b><span>${item.definition}</span>`;
      if(kicker) kicker.textContent=`每100元中，约${item.value.toFixed(0)}元用于${item.name}`;
    }
    const cEl=$('#consumptionChart');
    cEl?.on('plotly_hover',ev=>{const name=ev.points[0].y,item=c.find(x=>x.name===name);setConsumptionDetail(item)});
    cEl?.on('plotly_click',ev=>{const name=ev.points[0].y,item=c.find(x=>x.name===name);setConsumptionDetail(item)});
    setConsumptionDetail(c[0]);

    const s=D.incomeStructure,traces=s.categories.map((cat,i)=>({type:'bar',orientation:'h',name:cat,y:['城镇老人','农村老人'],x:[s.urban[i],s.rural[i]],marker:{color:[C.blue,C.red,C.gold,'#9c8a77'][i]},hovertemplate:`${cat}<br>%{y}：%{x:.1f}%<extra></extra>`}));
    safePlot('incomeCompareChart',traces,commonLayout({barmode:'stack',margin:{l:75,r:20,t:30,b:40},xaxis:{...commonLayout().xaxis,title:'占收入比重（%）',range:[0,100]},yaxis:{...commonLayout().yaxis,showgrid:false},legend:{orientation:'h',x:.5,xanchor:'center',y:1.2,font:{size:9}}}));
    safePlot('ruralIncomeChart',[{type:'pie',labels:s.categories,values:s.rural,hole:.56,sort:false,pull:[.05,0,0,0],marker:{colors:[C.blue,C.red,C.gold,'#9c8a77'],line:{color:'#fff',width:3}},hovertemplate:'%{label}<br>%{value:.1f}%<extra></extra>'}],commonLayout({margin:{l:15,r:15,t:15,b:15},showlegend:true,legend:{orientation:'h',x:.5,xanchor:'center',y:-.08,font:{size:10}}}));
    function incomeDetail(name){const i=s.categories.indexOf(name),items=D.incomeDetails[name];$('#incomeDetail').innerHTML=`<span class="badge">农村老年人收入构成</span><h3>${name}</h3><strong>${s.rural[i].toFixed(1)}%</strong><div class="detail-list">${items.map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`}
    $('#ruralIncomeChart')?.on('plotly_click',ev=>incomeDetail(ev.points[0].label));incomeDetail('社会保障性收入');
  }

  function initLabor(){
    const d=D.migrant,gap=d.income.map((v,i)=>+(v-d.pension[i]).toFixed(2));
    safePlot('laborGapChart',[
      {type:'bar',name:'收入差额',x:d.years,y:gap,marker:{color:'rgba(242,190,134,.5)'},hovertemplate:'%{x}年<br>差额：%{y:.2f}元<extra></extra>'},
      {type:'scatter',mode:'lines+markers',name:'农民工月均收入',x:d.years,y:d.income,line:{color:C.ink,width:3},hovertemplate:'%{x}年<br>农民工月均收入：%{y:.0f}元<extra></extra>'},
      {type:'scatter',mode:'lines+markers',name:'居民养老月均支出估算',x:d.years,y:d.pension,line:{color:C.red,width:3},customdata:d.income.map((v,i)=>v/d.pension[i]),hovertemplate:'%{x}年<br>养老金估算：%{y:.2f}元<br>收入倍数：%{customdata:.2f}倍<extra></extra>'}
    ],commonLayout({hovermode:'x unified',yaxis:{...commonLayout().yaxis,title:'元/月'},xaxis:{...commonLayout().xaxis,dtick:2},legend:{orientation:'h',x:.5,xanchor:'center',y:1.18,font:{size:9}}}));
    safePlot('agingWorkerChart',[{type:'scatter',mode:'lines+markers',x:d.ageYears,y:d.age50,fill:'tozeroy',fillcolor:'rgba(253,130,0,.10)',line:{color:C.accent,width:4},marker:{size:7,color:d.ageYears.map(y=>y===2025?C.brick:C.accent)},hovertemplate:'%{x}年<br>50岁以上占比：%{y:.1f}%<extra></extra>'}],commonLayout({showlegend:false,yaxis:{...commonLayout().yaxis,title:'占比（%）',range:[0,36]},xaxis:{...commonLayout().xaxis,dtick:2},annotations:[{x:2025,y:32,text:'约每3人中1人',showarrow:true,arrowcolor:C.brick,font:{color:C.brick}}]}));
  }

  function initVoiceAnalysis(){
    const themes=D.voiceThemes||[],words=D.highFrequencyWords||[],meta=D.voiceMeta||{};
    const rows=['voiceWordsA','voiceWordsB','voiceWordsC','voiceWordsD'];
    rows.forEach((id,ri)=>{const subset=words.filter((_,i)=>i%rows.length===ri);const html=[...subset,...subset].map((w,i)=>{const size=12+Math.min(14,Math.round(w.documentRate*18));const opacity=.14+Math.min(.24,w.documentRate*.28);return `<span style="--word-size:${size}px;--word-opacity:${opacity.toFixed(2)}">${w.word}</span>`}).join('');$(`#${id}`).innerHTML=html});
    const bubbleWrap=$('#voiceBubbles');let active=0,quoteIndex=0;
    themes.forEach((t,i)=>{const size=Math.round(80+t.coverage*3.2);const b=document.createElement('button');b.type='button';b.className='voice-bubble';b.dataset.index=i;b.style.setProperty('--bubble-size',`${size}px`);b.style.setProperty('--bubble-color',t.color);b.setAttribute('role','listitem');b.setAttribute('aria-label',`${t.name}，覆盖率${t.coverage.toFixed(2)}%`);b.innerHTML=`<small>主题 ${String(i+1).padStart(2,'0')}</small><b>${t.short}</b><strong>${t.coverage.toFixed(2)}%</strong><em>${t.bubbleKeywords.join(' · ')}</em>`;['mouseenter','focus','click'].forEach(ev=>b.addEventListener(ev,()=>selectTheme(i)));bubbleWrap.appendChild(b)});
    function renderQuote(){const t=themes[active],m=t.messages[quoteIndex];$('#voiceMessageTitle').textContent=m.title;$('#voiceMessageText').textContent=m.text;$('#voiceMessageMeta').textContent=`${m.date} · ${m.source}`;$('#voiceQuoteCount').textContent=`${quoteIndex+1} / ${t.messages.length}`}
    function selectTheme(i){active=i;quoteIndex=0;const t=themes[i];$$('.voice-bubble',bubbleWrap).forEach((b,j)=>b.classList.toggle('active',j===i));$('#voiceThemeIndex').textContent=String(i+1).padStart(2,'0');$('#voiceThemeName').textContent=t.name;$('#voiceThemeCoverage').textContent=`${t.coverage.toFixed(2)}%`;$('#voiceThemeCount').textContent=`${fmt(t.count)}条留言`;$('#voiceThemeSummary').textContent=t.description;$('#voiceThemeAnalysis').textContent=t.analysis;$('#voiceKeywordList').innerHTML=t.keywords.map(k=>`<i>${k}</i>`).join('');$('#voiceDetail').style.borderTop=`5px solid ${t.color}`;renderQuote()}
    $('#voicePrev').addEventListener('click',()=>{const t=themes[active];quoteIndex=(quoteIndex-1+t.messages.length)%t.messages.length;renderQuote()});$('#voiceNext').addEventListener('click',()=>{const t=themes[active];quoteIndex=(quoteIndex+1)%t.messages.length;renderQuote()});
    $('#voiceCoverageCaption').textContent=`四类主题覆盖${(meta.fourThemeCoverage||99.34).toFixed(2)}%的相关留言`;
    selectTheme(0);
  }

  function initTimeline(){
    const nav=$('#timelineNav'),tl=$('#timeline');D.timeline.forEach((x,i)=>{const id=`time-${x.year}-${i}`;const b=document.createElement('button');b.textContent=x.year;b.title=x.title;b.addEventListener('click',()=>document.getElementById(id).scrollIntoView({behavior:'smooth',block:'center'}));nav.appendChild(b);const item=document.createElement('article');item.className='timeline-item';item.id=id;item.innerHTML=`<div class="timeline-year">${x.year}</div><div class="timeline-card"><span class="stage">${x.stage}</span><h4>${x.title}</h4><p>${x.text}</p></div>`;tl.appendChild(item)});
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('visible',e.isIntersecting)),{threshold:.2});$$('.timeline-item').forEach(x=>obs.observe(x));
  }


  function initPolicyStandard(){
    const d=D.policyStandards||[];if(!d.length)return;
    const years=d.map(x=>x.year),values=d.map(x=>x.value);
    safePlot('policyStandardChart',[{type:'scatter',mode:'lines+markers',x:years,y:values,line:{color:C.red,width:4,shape:'hv'},marker:{size:d.map(x=>x.change>0?10:5),color:d.map(x=>x.change>0?C.brick:C.bar)},customdata:d.map(x=>[x.change,x.note,x.source]),hovertemplate:'%{x}年<br>最低标准：%{y:.0f}元/月<br>调整：%{customdata[0]:+.0f}元<br>%{customdata[1]}<extra></extra>'}],commonLayout({showlegend:false,hovermode:'closest',xaxis:{...commonLayout().xaxis,dtick:2},yaxis:{...commonLayout().yaxis,title:'元/月',range:[45,175]},annotations:d.filter(x=>x.change>0).map(x=>({x:x.year,y:x.value,text:`${x.value}元`,showarrow:true,arrowcolor:C.muted,font:{size:10,color:C.brick}}))}));
    const el=$('#policyStandardChart');el?.on('plotly_hover',ev=>{const i=ev.points[0].pointIndex,x=d[i];$('#policyStandardDetail').innerHTML=`<b>${x.year}年：${x.value.toFixed(0)}元/月</b><span>${x.note||'本年度全国最低标准保持不变。'}${x.source?` 来源：${x.source}`:''}</span>`});
  }

  function initCases(){
    const titles=D.caseTitles;function row(list){return [...list,...list].map(t=>`<span>✦ ${t}</span>`).join('')}$('#tickerA').innerHTML=row(titles.slice(0,15));$('#tickerB').innerHTML=row(titles.slice(14));
    const tabs=$('#caseTabs'),keys=Object.keys(D.cases);let active=keys[0];keys.forEach(k=>{const b=document.createElement('button');b.textContent=k;if(k===active)b.classList.add('active');b.addEventListener('click',()=>{active=k;$$('button',tabs).forEach(x=>x.classList.toggle('active',x===b));render()});tabs.appendChild(b)});
    function render(){const c=D.cases[active];$('#caseDesc').textContent=c.desc;$('#caseContent').innerHTML=c.items.map((x,i)=>`<article class="case-card ${i%2?'reverse':''}"><div class="case-copy"><span class="meta">${x.province} · ${x.year}</span><h3>${x.title}</h3><span class="mode-tag">核心模式：${x.mode}</span>${x.text.split(/\n+/).filter(Boolean).map(p=>`<p>${p}</p>`).join('')}<div class="case-source">数据来源：${x.source||'农业农村部全国农村公共服务典型案例'}</div></div><div class="case-gallery" data-index="0">${x.images.map((im,j)=>`<img class="${j===0?'active':''}" src="${im}" alt="${x.province}养老实践现场图${j+1}">`).join('')}<div class="gallery-controls"><button data-dir="-1" aria-label="上一张">←</button><button data-dir="1" aria-label="下一张">→</button></div></div></article>`).join('');$$('.gallery-controls button').forEach(btn=>btn.addEventListener('click',()=>{const g=btn.closest('.case-gallery'),imgs=$$('img',g);let idx=(+g.dataset.index + +btn.dataset.dir + imgs.length)%imgs.length;g.dataset.index=idx;imgs.forEach((im,j)=>im.classList.toggle('active',j===idx))}))}render();
  }

  function initForeign(){
    const flags={德国:'🇩🇪',法国:'🇫🇷',日本:'🇯🇵',韩国:'🇰🇷',印度:'🇮🇳'};$('#foreignGrid').innerHTML=D.foreign.map(x=>`<article class="foreign-card"><button type="button"><span class="flag">${flags[x.country]||'🌍'}</span><span class="tag">${x.tag}</span><h3>${x.country}</h3><div>${x.headline}</div><span class="metric">${x.metric}</span></button><div class="more"><p>${x.text}</p><a href="${x.url}" target="_blank" rel="noopener">${x.source} ↗</a></div></article>`).join('');$$('.foreign-card>button').forEach(btn=>btn.addEventListener('click',()=>btn.parentElement.classList.toggle('open')));
  }

  function initSources(){
    const dialog=$('#sourceDialog');const open=()=>dialog.showModal();$('#sourceOpen').addEventListener('click',open);$('#sourceOpenFooter').addEventListener('click',open);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});$('#sourceList').innerHTML=D.sources.map(x=>x.url?`<a href="${x.url}" target="_blank" rel="noopener"><b>${x.name}</b><span>${x.org} ↗</span></a>`:`<div><b>${x.name}</b><span>${x.org}</span></div>`).join('');
  }
  function initDownloads(){
    $$('.download-chart').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.chart,el=charts.get(id);if(!el)return toast('图表尚未加载完成');Plotly.downloadImage(el,{format:'png',filename:`农村养老金-${id}`,width:1400,height:800,scale:1}).then(()=>toast('已生成图表图片'))}));
  }
  function initResize(){let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>charts.forEach(el=>Plotly.Plots.resize(el)),150)})}

  function initGsapEngine(){
    if(!window.gsap||!window.ScrollTrigger)return false;
    gsap.registerPlugin(ScrollTrigger);
    return true;
  }
  function initGsapChartEntrances(){
    if(!window.gsap||!window.ScrollTrigger)return;
    const modules=new Set();
    $$('.plot').forEach(el=>{const module=el.closest('.chart-card,.dual-view,.income-drill');if(module)modules.add(module)});
    ['.province-module','.pictogram-wrap','.burden-card','.reservoir-panel','.pension-flow','.calculator-card','.basket-module','.voice-analysis'].forEach(selector=>$$(selector).forEach(el=>modules.add(el)));
    const effects=[
      {x:-100,y:0,rotationY:-7,scale:.98},
      {x:100,y:0,rotationY:7,scale:.98},
      {x:0,y:74,rotationX:7,scale:.96},
      {x:-65,y:45,rotation:-1.5,scale:.97},
      {x:65,y:45,rotation:1.5,scale:.97},
      {x:0,y:0,rotationX:0,scale:.86}
    ];
    const mm=gsap.matchMedia();
    mm.add({reduce:'(prefers-reduced-motion: reduce)',motion:'(prefers-reduced-motion: no-preference)'},context=>{
      if(context.conditions.reduce||document.body.classList.contains('motion-off')){gsap.set([...modules],{clearProps:'all'});return}
      [...modules].forEach((module,i)=>{
        const effect=effects[i%effects.length];
        const inner=module.querySelectorAll('.chart-title,.plot,#provinceMap,.interactive-detail,.footnote,.live-card,.province-detail');
        const tl=gsap.timeline({defaults:{ease:'power3.out'},scrollTrigger:{trigger:module,start:'top 84%',toggleActions:'play none none none',once:true}});
        tl.fromTo(module,{autoAlpha:0,transformPerspective:900,transformOrigin:'50% 55%',...effect},{autoAlpha:1,x:0,y:0,rotation:0,rotationX:0,rotationY:0,scale:1,duration:.95,clearProps:'transform,opacity,visibility'});
        if(inner.length)tl.fromTo(inner,{autoAlpha:0,y:22},{autoAlpha:1,y:0,duration:.55,stagger:{each:.055,from:'start'},clearProps:'transform,opacity,visibility'},'-=.48');
      });
      requestAnimationFrame(()=>ScrollTrigger.refresh());
    });
  }

  function boot(){
    initGsapEngine();initReveal();initHeroQuestions();initScrollUI();initPopulation();initPictogram();initBurden();initFlow();initCoverage();initGap();initProvince();initCost();initBasket();initConsumptionIncome();initLabor();initVoiceAnalysis();initTimeline();initPolicyStandard();initCases();initForeign();initSources();initDownloads();initResize();initGsapChartEntrances();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
