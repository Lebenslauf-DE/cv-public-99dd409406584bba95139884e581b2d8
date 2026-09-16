'use strict';const preparePrint=function preparePrint(doc = document) {
 const source = doc.querySelector('.cv-document:not(.cv-sheet)');
 if (!source) return;
 doc.querySelector('.cv-pages')?.remove();
 doc.body.classList.remove('cv-print-ready');
 doc.body.classList.add('cv-paginated');
 const pages = doc.createElement('div'); pages.className = 'cv-pages';
 doc.body.append(pages);
 const sheets = [], dir = source.querySelector('.cv-main').dir || 'ltr';
 const footer = source.querySelector('.cv-footer');
 const make = index => {
  if (sheets[index]) return sheets[index];
  const sheet = doc.createElement('section'); sheet.className = 'cv-sheet';
  const side = doc.createElement('aside'); side.className = 'cv-sidebar cv-page-side'; side.dir = dir;
  const main = doc.createElement('div'); main.className = 'cv-body cv-page-main'; main.dir = dir;
  const foot = footer.cloneNode(true); foot.className = 'cv-footer cv-page-footer'; foot.dir = 'ltr';
  const count = doc.createElement('span'); count.className = 'cv-page-number';
  foot.insertBefore(count, foot.lastElementChild);
  const date = foot.firstElementChild;
  date.textContent = (date.textContent.split(':')[0] || '') + ': ' + new Date().toLocaleDateString('de-DE');
  sheet.append(side,main,foot); pages.append(sheet);
  return sheets[index] = {sheet,side,main};
 };
 const fits = box => !box.lastElementChild || box.lastElementChild.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + .25;
 // Split oversized content at text boundaries while preserving nested markup.
 const slice = (node,start,end) => {
  const walker = doc.createTreeWalker(node,4), leaves=[]; let n,total=0;
  while ((n=walker.nextNode())) { leaves.push({node:n,start:total,end:total+n.length}); total+=n.length; }
  const clone=node.cloneNode(false); if(start===end)return clone;
  const first=leaves.find(x=>x.end>start),last=leaves.find(x=>x.end>=end);
  if(!first||!last)throw Error('Invalid print text range');
  const range=doc.createRange();range.setStart(first.node,start-first.start);range.setEnd(last.node,end-last.start);
  clone.append(range.cloneContents());return clone;
 };
 const fill = (nodes,column) => {
  let index=0,box=make(0)[column];
  const next=()=>{box=make(++index)[column];};
  for(const original of nodes){
   let node=original.cloneNode(true);box.append(node);
   if(fits(box))continue;
   node.remove();
   if(box.children.length){next();box.append(node);if(fits(box))continue;node.remove();}
   // Only sections larger than an entire content area may be split.
   const heading=node.matches('.cv-section')?node.querySelector(':scope > h2'):null;
   if(heading)heading.remove();
   const length=node.textContent.length;let start=0;
   if(!length)throw Error('Print element exceeds A4 area');
   while(start<length){
    let low=start+1,high=length,best=start,bestNode;
    while(low<=high){
     const mid=Math.floor((low+high)/2),candidate=slice(node,start,mid);
     if(heading)candidate.prepend(heading.cloneNode(true));box.append(candidate);
     const ok=fits(box);candidate.remove();
     if(ok){best=mid;bestNode=candidate;low=mid+1;}else high=mid-1;
    }
    if(best===start)throw Error('Print content cannot fit');
    // Prefer whitespace to avoid cutting a word between pages.
    if(best<length){const text=node.textContent;let cut=best;while(cut>start&&!/\s/.test(text[cut-1]))cut--;if(cut>start){best=cut;bestNode=slice(node,start,best);if(heading)bestNode.prepend(heading.cloneNode(true));}}
    box.append(bestNode);start=best;if(start<length)next();
   }
  }
 };
 try {
  const main=source.querySelector('.cv-main'),side=source.querySelector('.cv-sidebar');
  fill([main.querySelector('.cv-header'),...main.querySelector('.cv-body').children].filter(Boolean),'main');
  fill([...side.children],'side');
  sheets.forEach(({sheet},i)=>{sheet.querySelector('.cv-page-number').textContent=sheets.length>1?`${i+1} / ${sheets.length}`:'';});
  doc.body.classList.add('cv-print-ready');
 } catch(error){pages.remove();doc.body.classList.remove('cv-paginated','cv-print-ready');throw error;}
};let printing=false;async function printCV(){if(printing)return;printing=true;try{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await document.fonts.ready;preparePrint(document);window.print();}finally{printing=false;}}window.addEventListener('beforeprint',()=>preparePrint(document));document.getElementById('print-cv')?.addEventListener('click',printCV);if(new URLSearchParams(location.search).get('print')==='1')window.addEventListener('load',()=>{history.replaceState(null,'',location.pathname);printCV();},{once:true});