'use strict';
window.QuizEngine = (()=>{
 function questions(content){return content.questions||[]}
 function question(content,id){return questions(content).find(q=>q.id===id)}
 function start(content,track,length){const ids=content.shortSets?.[track]?.[String(length)];if(!Array.isArray(ids)||ids.length!==Number(length)||new Set(ids).size!==ids.length||ids.some(id=>!question(content,id)||question(content,id).track!==track))throw new Error('Invalid quiz set');return {track,length:Number(length),ids:[...ids],index:0,answers:{},selected:null,finished:false}}
 function select(run,index){if(!run||run.finished||run.answers[run.ids[run.index]]||!Number.isInteger(index)||index<0||index>3)return run;return {...run,selected:index}}
 function submit(content,run){const id=run.ids[run.index],q=question(content,id);if(!q||run.selected===null||run.answers[id])return run;return {...run,answers:{...run.answers,[id]:{choice:run.selected,correct:run.selected===q.correctIndex}}}}
 function next(run){if(!run.answers[run.ids[run.index]])return run;if(run.index===run.ids.length-1){if(run.ids.every(id=>run.answers[id]))return {...run,finished:true};return run}const index=run.index+1;return {...run,index,selected:run.answers[run.ids[index]]?.choice??null}}
 function previous(run){if(run.index===0)return run;const index=run.index-1;return {...run,index,selected:run.answers[run.ids[index]]?.choice??null}}
 function score(run){const answered=run.ids.filter(id=>run.answers[id]).length;const correct=run.ids.filter(id=>run.answers[id]?.correct).length;return {answered,correct,total:run.ids.length,percent:answered?Math.round(correct/answered*100):0,complete:answered===run.ids.length}}
 function valid(content,run){if(!run||!run.answers||typeof run.answers!=='object'||!Number.isInteger(run.index)||!['story','musical'].includes(run.track)||![5,10,25].includes(run.length)||!Array.isArray(run.ids)||run.ids.length!==run.length||new Set(run.ids).size!==run.length||run.index<0||run.index>=run.length||run.ids.some(id=>question(content,id)?.track!==run.track))return false;return run.ids.every(id=>!run.answers[id]||Number.isInteger(run.answers[id].choice)&&run.answers[id].choice>=0&&run.answers[id].choice<4)}
 function normalize(content,run){const answers={};for(const id of run.ids){const a=run.answers[id];if(a)answers[id]={choice:a.choice,correct:a.choice===question(content,id).correctIndex}}return {...run,answers,selected:answers[run.ids[run.index]]?.choice??null,finished:Boolean(run.finished&&run.ids.every(id=>answers[id]))}}
 return {questions,question,start,select,submit,next,previous,score,valid,normalize};
})();
