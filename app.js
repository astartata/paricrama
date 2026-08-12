(async function () {
  const d = window.PARIKRAMA_DATA;
  const app = document.querySelector('#app');
  const title = document.querySelector('#page-title');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]));
  const key = value => String(value || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const waitFirebase = async () => { while (!window.firebaseReady) await new Promise(r => setTimeout(r, 100)); return window.firebaseReady; };
  const toast = message => { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); };

  async function save(collectionName, id, data) {
    const f = await waitFirebase();
    await f.setDoc(f.doc(f.db, collectionName, key(id)), {...data, updatedAt: f.serverTimestamp()}, {merge: true});
  }

  async function readCloud() {
    try {
      const f = await waitFirebase();
      const registrations = await f.getDocs(f.collection(f.db, 'registrations'));
      registrations.forEach(snap => {
        const reg = snap.data();
        (reg.participants || []).forEach((person, participantIndex) => {
          let guest = d.guests.find(x => x.email && x.email === person.email) || d.guests.find(x => x.name === person.name);
          if (!guest) { guest = {name: person.name, refusal: false}; d.guests.push(guest); }
          Object.assign(guest, person, {registrationId: snap.id, participantIndex, receipts: reg.receipts || [], beds: reg.beds || [], status: reg.status || 'new'});
        });
      });
      const roomDocs = await f.getDocs(f.collection(f.db, 'adminRooms'));
      roomDocs.forEach(snap => {
        const data = snap.data();
        let room = d.rooms.find(x => x.roomId === data.roomId || key(x.roomId) === snap.id);
        if (data.deleted) { if (room) room.deleted = true; return; }
        if (!room) { room = {...data, roomId: data.roomId || snap.id, beds: Number(data.beds) || 2}; d.rooms.push(room); }
        else Object.assign(room, data);
      });
      d.rooms = d.rooms.filter(x => !x.deleted);
      return registrations;
    } catch (error) { console.error(error); toast('Firebase: ' + (error.message || 'не удалось загрузить данные')); return null; }
  }

  function placeInfo(room, n, registrations, locks) {
    const lock = locks[room.roomId + '-' + n];
    if (lock && lock.type === 'admin') return {state:'admin', text:'заблокировано · ' + (lock.name || 'администратор'), note:lock.note || ''};
    for (const reg of registrations || []) {
      const data = reg.data();
      if ((data.beds || []).includes(room.roomId + '-' + n)) return {state:'busy', text:'занято · ' + (data.participants || []).map(x => x.name).filter(Boolean).join(', '), note:data.loginEmail || ''};
    }
    const name = room['g' + n];
    return name ? {state:'busy', text:'занято · ' + name, note:''} : {state:'free', text:'свободно', note:''};
  }

  async function cloudPlacement() {
    const f = await waitFirebase();
    const [registrations, lockDocs] = await Promise.all([f.getDocs(f.collection(f.db, 'registrations')), f.getDocs(f.collection(f.db, 'placeLocks'))]);
    const locks = {}; lockDocs.forEach(x => locks[x.id] = x.data());
    return {registrations: registrations.docs, locks};
  }

  function render(view = 'dashboard') {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view));
    title.textContent = ({dashboard:'Обзор', guests:'Участники', rooms:'Размещение', payments:'Оплаты', settings:'Настройки года'}[view] || view);
    ({dashboard, guests, rooms, payments, settings}[view] || dashboard)();
  }

  function dashboard() {
    const occupied = d.rooms.reduce((n, r) => n + ['g1','g2','g3','g4'].filter(x => r[x]).length, 0);
    const total = d.rooms.reduce((n, r) => n + Number(r.beds || 0), 0);
    app.innerHTML = `<div class="grid metrics"><div class="metric"><div class="metric-label">Участники</div><div class="metric-value">${d.guests.filter(x => !x.refusal).length}</div><div class="metric-note">из заявок Firebase</div></div><div class="metric"><div class="metric-label">Места</div><div class="metric-value">${occupied} / ${total}</div><div class="metric-note">занято</div></div></div><div class="panel"><div class="panel-head"><h2>Размещение</h2><button class="link" data-go="rooms">Открыть базу комнат →</button></div><p class="sub">Данные обновляются из Firebase.</p></div>`;
    document.querySelector('[data-go]')?.addEventListener('click', () => render('rooms'));
  }

  function guests() {
    const list = d.guests.filter(x => !x.refusal);
    app.innerHTML = `<div class="panel"><div class="panel-head"><h2>Участники</h2><button class="primary" id="reload-guests">Обновить</button></div><div class="table-wrap"><table class="table"><thead><tr><th>ФИО</th><th>Email</th><th>Город / страна</th><th>Место</th><th>Чек</th><th></th></tr></thead><tbody>${list.map((g, i) => `<tr><td class="name">${esc(g.name)}</td><td>${esc(g.email)}</td><td>${esc(g.city)} / ${esc(g.country)}</td><td>${esc((g.beds || []).join(', '))}</td><td>${g.receipts?.[0]?.url ? `<a class="link" href="${esc(g.receipts[0].url)}" target="_blank">Открыть</a>` : '—'}</td><td><button class="edit-button edit-guest" data-index="${d.guests.indexOf(g)}">Редактировать</button></td></tr>`).join('')}</tbody></table></div></div>`;
    document.querySelector('#reload-guests').onclick = async () => { await readCloud(); render('guests'); };
    document.querySelectorAll('.edit-guest').forEach(button => button.onclick = () => editGuest(d.guests[Number(button.dataset.index)]));
  }

  function editGuest(g) {
    const modal = document.createElement('div'); modal.className = 'edit-modal'; modal.style = 'position:fixed;inset:0;background:#20252a66;display:grid;place-items:center;padding:20px;z-index:30';
    modal.innerHTML = `<form class="edit-dialog" style="width:min(700px,100%);max-height:90vh;overflow:auto;background:#fffdfb;border-radius:14px;padding:22px"><h2>Редактирование участника</h2><div class="fields">${[['name','ФИО'],['spirit','Духовное имя'],['email','Email'],['phone','Телефон'],['age','Возраст'],['city','Город'],['country','Страна'],['tariff','Тариф']].map(([name,label]) => `<div class="field"><label>${label}</label><input name="${name}" value="${esc(g[name])}"></div>`).join('')}<div class="field full"><label>Ссылка на чек</label><input name="receiptLink" type="url" value="${esc(g.receipts?.[0]?.url || '')}"></div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button type="button" class="ghost" data-cancel>Отмена</button><button class="primary">Сохранить</button></div></form>`;
    document.body.appendChild(modal); modal.querySelector('[data-cancel]').onclick = () => modal.remove();
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const fd = new FormData(event.target), fields = ['name','spirit','email','phone','age','city','country','tariff']; fields.forEach(x => g[x] = fd.get(x)); const link = String(fd.get('receiptLink') || '').trim(); g.receipts = link ? [{name:'Ссылка на чек', url:link}] : [];
      try { const f = await waitFirebase(); if (g.registrationId !== undefined) { const snap = await f.getDocs(f.collection(f.db, 'registrations')); const found = snap.docs.find(x => x.id === g.registrationId); if (found) { const reg = found.data(), people = [...(reg.participants || [])]; people[g.participantIndex] = {...people[g.participantIndex], ...Object.fromEntries(fields.map(x => [x, g[x]]))}; await f.updateDoc(f.doc(f.db, 'registrations', g.registrationId), {participants:people, receipts:g.receipts, updatedAt:f.serverTimestamp()}); } } await save('adminGuests', g.email || g.name, g); modal.remove(); await readCloud(); render('guests'); toast('Изменения сохранены'); } catch (error) { toast('Ошибка сохранения: ' + error.message); }
    };
  }

  async function rooms() {
    let placement; try { placement = await cloudPlacement(); } catch { placement = {registrations:[], locks:{}}; }
    app.innerHTML = `<div class="panel"><div class="panel-head"><div><h2>База комнат и мест</h2><p class="sub">Занятые места и блокировки загружены из Firebase.</p></div><button class="primary" id="reload-rooms">Обновить</button></div><div class="grid room-grid">${d.rooms.map((r, ri) => `<div class="room-card"><div class="room-top"><div><div class="room-id">${esc(r.roomId)}</div><div class="room-hotel">${esc(r.hotel)} · ${esc(r.tariff)}</div></div><button class="edit-button edit-room" data-room="${ri}">Изменить</button></div><div class="room-sectors" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${Array.from({length:Number(r.beds)||2}, (_, i) => { const p=placeInfo(r,i+1,placement.registrations,placement.locks); return `<div class="admin-place" style="border:1px solid var(--line);border-radius:9px;padding:10px;background:${p.state==='busy'?'#f1f0ed':p.state==='admin'?'#fff0e0':'#fff'}"><b>Место ${i+1}</b><div class="sub">${esc(p.text)}</div>${p.note?`<div class="sub">${esc(p.note)}</div>`:''}<button class="edit-button toggle-lock" data-room="${ri}" data-place="${i+1}">${p.state==='admin'?'Снять блокировку':'Заблокировать'}</button></div>`}).join('')}</div></div>`).join('')}</div></div>`;
    document.querySelector('#reload-rooms').onclick = async () => { await readCloud(); render('rooms'); };
    document.querySelectorAll('.edit-room').forEach(b => b.onclick = () => editRoom(d.rooms[Number(b.dataset.room)]));
    document.querySelectorAll('.toggle-lock').forEach(b => b.onclick = async () => { const r=d.rooms[Number(b.dataset.room)], n=Number(b.dataset.place), id=r.roomId+'-'+n, existing=placement.locks[id]; try { if (existing?.type === 'admin') await save('placeLocks', id, {type:'released', releasedAt:new Date().toISOString()}); else { const name=prompt('Кто блокирует место? Имя и фамилия:',''); if (name === null) return; const note=prompt('Комментарий:','') || ''; await save('placeLocks', id, {type:'admin',name:name || 'Команда',note,roomId:r.roomId,place:n}); } render('rooms'); toast('Изменения сохранены'); } catch(error) { toast('Ошибка: '+error.message); } });
  }

  function editRoom(r) {
    const hotel=prompt('Название отеля:',r.hotel); if(hotel===null)return; const tariff=prompt('Тариф:',r.tariff); if(tariff===null)return; const beds=prompt('Количество мест:',r.beds); if(beds===null)return; const floor=prompt('Этаж:',r.floor || ''); if(floor===null)return;
    save('adminRooms',r.roomId,{...r,hotel,tariff,beds:Number(beds)||2,floor:Number(floor)||1}).then(()=>{Object.assign(r,{hotel,tariff,beds:Number(beds)||2,floor:Number(floor)||1});render('rooms');toast('Комната сохранена')}).catch(e=>toast('Ошибка сохранения: '+e.message));
  }

  function payments(){ app.innerHTML='<div class="panel"><h2>Оплаты</h2><p class="sub">Оплаты загружаются из заявок и чеков.</p></div>'; }

  function settings(){
    app.innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Отели и тарифы</h2><p class="sub">Редактируйте и сохраняйте каждую комнату.</p></div><button class="primary" id="new-room">+ Добавить</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Отель</th><th>Тариф</th><th>Мест</th><th>Этаж</th><th></th></tr></thead><tbody>${d.rooms.map((r,i)=>`<tr><td><input data-i="${i}" data-k="hotel" value="${esc(r.hotel)}"></td><td><input data-i="${i}" data-k="tariff" value="${esc(r.tariff)}"></td><td><input data-i="${i}" data-k="beds" type="number" min="1" value="${r.beds}"></td><td><input data-i="${i}" data-k="floor" value="${esc(r.floor)}"></td><td><button class="edit-button save-room" data-i="${i}">Сохранить</button> <button class="edit-button delete-room" data-i="${i}">Удалить</button></td></tr>`).join('')}</tbody></table></div></div>`;
    document.querySelectorAll('[data-k]').forEach(input=>input.oninput=()=>{const r=d.rooms[Number(input.dataset.i)];r[input.dataset.k]=input.dataset.k==='beds'||input.dataset.k==='floor'?Number(input.value)||1:input.value});
    document.querySelectorAll('.save-room').forEach(b=>b.onclick=async()=>{try{const r=d.rooms[Number(b.dataset.i)];await save('adminRooms',r.roomId,r);toast('Сохранено')}catch(e){toast('Ошибка: '+e.message)}});
    document.querySelectorAll('.delete-room').forEach(b=>b.onclick=async()=>{const r=d.rooms[Number(b.dataset.i)];if(!confirm('Удалить комнату '+r.roomId+'?'))return;try{await save('adminRooms',r.roomId,{roomId:r.roomId,deleted:true});d.rooms.splice(Number(b.dataset.i),1);settings();toast('Комната удалена')}catch(e){toast('Ошибка удаления: '+e.message)}});
    document.querySelector('#new-room').onclick=async()=>{const hotel=prompt('Название отеля:');if(!hotel)return;const tariff=prompt('Тариф:');if(!tariff)return;const r={roomId:'NEW_'+Date.now(),hotel,tariff,beds:2,floor:1,g1:'',g2:'',blockedPlaces:[]};d.rooms.push(r);try{await save('adminRooms',r.roomId,r);settings();toast('Комната добавлена')}catch(e){toast('Ошибка: '+e.message)}};
  }

  document.querySelector('#nav').onclick = e => { const button=e.target.closest('[data-view]'); if(button) render(button.dataset.view); };
  document.querySelector('#refresh').onclick = async () => { await readCloud(); render(document.querySelector('.nav-item.active')?.dataset.view || 'dashboard'); toast('Данные обновлены'); };
  await readCloud(); render('dashboard');
})();
