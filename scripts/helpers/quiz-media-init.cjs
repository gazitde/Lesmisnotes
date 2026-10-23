'use strict';
// Test-only Playwright initializer. BrowserContext scripts also run in every child
// frame and initial about:blank document; never touch their storage or install mocks.
module.exports=function installQuizMediaFixtures({functional,origin}){
 if(window.top!==window||window.location.origin!==origin)return;
 if(!window.sessionStorage.getItem('quiz-test-seeded')){
  const now=Date.now();window.localStorage.setItem('barricade-consent-v1',JSON.stringify({version:3,savedAt:now,expiresAt:now+180*86400000,functional,analytics:false,media:false}));
  for(const [key,value]of [['barricade-last-reading','{"kind":"chapter","key":"p1-b1-c3"}'],['barricade-completed-chapters-v1','{"completed":["p1-b1-c1"]}'],['barricade-bookmarks','["novel"]'],['barricade-listening','["stars"]']])window.localStorage.setItem(key,value);
  window.sessionStorage.setItem('barricade-after-consent','on');window.sessionStorage.setItem('barricade-novel-consent','on');window.sessionStorage.setItem('quiz-test-seeded','1');
 }
 window.__ytPlayers=[];window.YT={PlayerState:{PLAYING:1},Player:function(frame,options){this.frame=frame;this.options=options;this.destroy=()=>{};this.pauseVideo=()=>{};window.__ytPlayers.push(this)}};
};
