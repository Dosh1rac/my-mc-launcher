// Site version is kept in sync with package.json when preparing a release.
document.querySelectorAll('a[href="#download"]').forEach((link) => {
  link.addEventListener("click", () => document.querySelector("#download")?.scrollIntoView({ behavior: "smooth" }));
});

const canvas = document.querySelector("#void-space");
const ctx = canvas?.getContext("2d", { alpha: false });
if (canvas && ctx) {
  const W = 480, H = 270;
  const layer = document.createElement("canvas"); layer.width = W; layer.height = H;
  const bg = layer.getContext("2d");
  const rand = (min, max) => min + Math.random() * (max - min);
  const stars = Array.from({ length: matchMedia("(max-width:700px)").matches ? 85 : 155 }, () => ({ x: rand(0,W), y: rand(0,H), p: rand(0,Math.PI*2), s: rand(.5,2.2), c: ["#fff4ff","#eab0ff","#b76aff","#f498e8"][Math.floor(rand(0,4))] }));
  const pulsars = [[54,47],[178,22],[314,86],[92,151],[378,185],[235,212]].map(([x,y],i)=>({x,y,p:i*1.3,c:i%2?"#d98bff":"#ffacef"}));
  const meteors = []; let nextMeteor = 0, lastFrame = 0;
  function galaxy(g) {
    const glow=g.createRadialGradient(205,105,2,205,105,185);glow.addColorStop(0,"rgba(247,200,255,.74)");glow.addColorStop(.18,"rgba(184,93,255,.45)");glow.addColorStop(1,"rgba(110,42,180,0)");g.fillStyle=glow;g.fillRect(0,0,W,H);
    g.save();g.translate(205,105);g.rotate(-.42);
    for(let arm=0;arm<3;arm++) for(let i=0;i<260;i++){const t=i/260,a=arm*Math.PI*2/3+t*5.4,r=8+t*165,spread=1+t*9,x=Math.cos(a)*r+(Math.random()+Math.random()-1)*spread,y=(Math.sin(a)*r+(Math.random()+Math.random()-1)*spread)*.38;g.globalAlpha=(.18+Math.random()*.7)*(1-t*.35);g.fillStyle=["#fff1ff","#d69aff","#a657fa","#ff9be9"][Math.floor(Math.random()*4)];g.fillRect(Math.round(x),Math.round(y),Math.random()<.12?2:1,Math.random()<.12?2:1)}
    g.globalAlpha=1;g.restore();
  }
  if(bg){const grad=bg.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#08050f");grad.addColorStop(.62,"#1a0a2b");grad.addColorStop(1,"#100817");bg.fillStyle=grad;bg.fillRect(0,0,W,H);const neb=bg.createRadialGradient(290,165,2,290,165,190);neb.addColorStop(0,"rgba(159,48,210,.32)");neb.addColorStop(1,"rgba(8,5,15,0)");bg.fillStyle=neb;bg.fillRect(0,0,W,H);galaxy(bg);
    for(let i=0;i<65;i++){bg.fillStyle=`rgba(207,160,255,${rand(.04,.18)})`;bg.fillRect(Math.floor(rand(0,W)),Math.floor(rand(0,H)),1,1)}
  }
  function hole(now){const x=W*.86,y=H*.18,pulse=1+Math.sin(now/1300)*.04;const glow=ctx.createRadialGradient(x,y,5,x,y,72*pulse);glow.addColorStop(0,"rgba(255,226,255,.62)");glow.addColorStop(.32,"rgba(204,100,255,.38)");glow.addColorStop(1,"rgba(91,27,156,0)");ctx.fillStyle=glow;ctx.fillRect(x-74,y-74,148,148);ctx.save();ctx.translate(x,y);ctx.rotate(-.35);ctx.scale(1,.42);for(let r=18;r<48;r+=3){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.strokeStyle=`rgba(250,${Math.round(125+r)},255,${.8-r/110})`;ctx.lineWidth=2;ctx.stroke()}ctx.restore();ctx.fillStyle="#020106";ctx.beginPath();ctx.arc(x,y,15*pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ffe0ff";ctx.lineWidth=1;ctx.stroke()}
  function frame(now){if(!ctx||!bg)return;ctx.drawImage(layer,0,0,W,H);for(const s of stars){ctx.globalAlpha=.24+.76*Math.abs(Math.sin(now/850*s.s+s.p));ctx.fillStyle=s.c;ctx.fillRect(Math.round(s.x),Math.round(s.y),s.s>1.8?2:1,s.s>1.8?2:1)}ctx.globalAlpha=1;
    for(const p of pulsars){const pulse=.5+.5*Math.sin(now/650+p.p),b=2+Math.round(pulse*4);ctx.globalAlpha=.24+pulse*.65;ctx.fillStyle=p.c;ctx.fillRect(p.x-b,p.y,2*b+1,1);ctx.fillRect(p.x,p.y-b,1,2*b+1);ctx.globalAlpha=1;ctx.fillRect(p.x-1,p.y-1,2,2)}
    if(now>nextMeteor){meteors.push({x:rand(0,W*.72),y:-3,vx:rand(2.5,4.5),vy:rand(1.5,2.5),life:0});nextMeteor=now+rand(2200,5200)}
    for(let i=meteors.length-1;i>=0;i--){const m=meteors[i];m.x+=m.vx;m.y+=m.vy;m.life++;ctx.fillStyle="#f5c8ff";for(let k=0;k<8;k++){ctx.globalAlpha=.8-k*.09;ctx.fillRect(Math.round(m.x-m.vx*k),Math.round(m.y-m.vy*k),k<2?2:1,k<2?2:1)}ctx.globalAlpha=1;if(m.x>W||m.y>H||m.life>100)meteors.splice(i,1)}hole(now)}
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");let stopped=false;
  const loop=now=>{if(stopped)return;requestAnimationFrame(loop);if(document.hidden||now-lastFrame<66)return;lastFrame=now;frame(now)};
  if(reduced.matches){frame(0)}else requestAnimationFrame(loop);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!reduced.matches)frame(performance.now())});
  reduced.addEventListener?.("change",event=>{if(event.matches)frame(0);else requestAnimationFrame(loop)});
  const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);ctx.imageSmoothingEnabled=false;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);frame(performance.now())};
  addEventListener("resize",resize,{passive:true});resize();
}
