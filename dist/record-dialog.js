import { projectKey, projectNames, defaultCalculationName } from './calculation-records.js?v=2.12.0';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentDialog=null;
export function closeRecordDialog(){currentDialog?.close();}
// Native modal dialogs supply inert background, focus containment and Escape.
// Explicit close cleanup also handles navigation and restores the trigger focus.
function modal(title,content,onSubmit,submitLabel){
 closeRecordDialog();
 const trigger=document.activeElement,dialog=document.createElement('dialog');
 dialog.className='record-dialog';dialog.setAttribute('aria-labelledby','record-dialog-title');dialog.setAttribute('aria-describedby','record-dialog-help');
 dialog.innerHTML=`<form><h2 id="record-dialog-title">${esc(title)}</h2>${content}<p id="record-dialog-error" class="warning error" role="alert" hidden></p><div class="actions"><button type="button" class="button" id="record-dialog-cancel">Cancel</button><button type="submit" class="button" id="record-dialog-submit">${esc(submitLabel)}</button></div></form>`;
 document.body.appendChild(dialog);currentDialog=dialog;
 dialog.addEventListener('close',()=>{if(currentDialog===dialog)currentDialog=null;dialog.remove();if(trigger?.isConnected)trigger.focus();else document.querySelector('#saved-heading')?.focus();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
 dialog.querySelector('#record-dialog-cancel').onclick=()=>dialog.close();
 dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();try{onSubmit(dialog);dialog.close()}catch(error){const node=dialog.querySelector('#record-dialog-error');node.textContent=error.message;node.hidden=false;}});
 dialog.showModal();return dialog;
}
export function showRecordDialog({records=[],projectName='',calculationName='',rename=false,onSave}){
 const projects=projectNames(records),selected=projects.find(p=>projectKey(p)===projectKey(projectName));
 const dialog=modal(rename?'Rename calculation':'Save calculation',`<p id="record-dialog-help">Select an existing project or enter a new one. A blank calculation name uses your local date and time.</p><div class="field"><label for="record-project-choice">Project</label><select id="record-project-choice">${projects.map((p,i)=>`<option value="${i}" ${p===selected?'selected':''}>${esc(p)}</option>`).join('')}<option value="new" ${selected===undefined?'selected':''}>New project…</option></select></div><div class="field" id="record-new-project-field"><label for="record-new-project">New project name (optional)</label><input id="record-new-project" maxlength="100" value="${esc(selected===undefined?projectName:'')}" placeholder="Unassigned"></div><div class="field"><label for="record-calculation-name">Calculation name (optional)</label><input id="record-calculation-name" maxlength="100" value="${esc(calculationName)}" placeholder="${esc(defaultCalculationName())}"></div>`,node=>{const choice=node.querySelector('#record-project-choice').value;onSave({projectName:choice==='new'?node.querySelector('#record-new-project').value:projects[Number(choice)],calculationName:node.querySelector('#record-calculation-name').value});},rename?'Save changes':'Save calculation');
 const choice=dialog.querySelector('#record-project-choice'),field=dialog.querySelector('#record-new-project-field'),input=dialog.querySelector('#record-new-project');
 const update=()=>{field.hidden=choice.value!=='new';input.disabled=field.hidden;};choice.addEventListener('change',()=>{update();if(!field.hidden)input.focus()});update();
 (selected===undefined?input:dialog.querySelector('#record-calculation-name')).focus();
 return dialog;
}
export function confirmRecordClear({count,projectName,onConfirm}){
 return modal(projectName===undefined?'Clear all saved calculations?':`Clear project ${projectName}?`,`<p id="record-dialog-help">Move ${count} saved calculation${count===1?'':'s'}${projectName===undefined?'':` in ${esc(projectName)}`} to trash? You can restore them individually from Trash. Nothing will be permanently deleted.</p>`,()=>onConfirm(),'Move to trash');
}
