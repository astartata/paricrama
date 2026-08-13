(async function () {
  const d = window.PARIKRAMA_DATA;
  const baseGuests = (d.guests || []).map(guest => ({...guest}));
  const baseRooms = (d.rooms || []).map(room => ({...room}));
  const app = document.querySelector('#app');
  const title = document.querySelector('#page-title');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]));
  const key = value => {
    const raw = String(value || 'unknown').trim() || 'unknown';
    const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 90);
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    const suffix = Math.abs(hash).toString(36);
    if (!clean || /^__.*__$/.test(clean) || clean === '_') return 'guest_' + suffix;
    return clean + '_' + suffix;
  };
  const waitFirebase = async () => { while (!window.firebaseReady) await new Promise(r => setTimeout(r, 100)); return window.firebaseReady; };
  const toast = message => { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); };

  async function requireAdmin() {
    const f = await waitFirebase();
    const hasAdminAccess = async user => {
      if (!user) return false;
      const adminDoc = await f.getDoc(f.doc(f.db, 'admins', user.uid));
      return adminDoc.exists();
    };
    const currentUser = await new Promise(resolve => f.onAuthStateChanged(f.auth, resolve));
    if (await hasAdminAccess(currentUser)) return true;
    if (currentUser) await f.signOut(f.auth);
    title.textContent = 'Вход администратора';
    app.innerHTML = `<div class="panel" style="max-width:460px"><div class="panel-head"><div><h2>Админка</h2><p class="sub">Войдите под аккаунтом администратора.</p></div></div><div class="fields" style="grid-template-columns:1fr"><div class="field"><label>Email</label><input id="admin-email" type="email" autocomplete="username"></div><div class="field"><label>Пароль</label><input id="admin-password" type="password" autocomplete="current-password"></div></div><button class="primary" id="admin-login" style="margin-top:14px">Войти</button><p class="sub" id="admin-status" style="margin-top:12px"></p></div>`;
    return new Promise(resolve => {
      document.querySelector('#admin-login').onclick = async () => {
        const email = document.querySelector('#admin-email').value.trim();
        const password = document.querySelector('#admin-password').value;
        const status = document.querySelector('#admin-status');
        if (!email || !password) { status.textContent = 'Введите email и пароль'; return; }
        try {
          const credential = await f.signInWithEmailAndPassword(f.auth, email, password);
          if (!(await hasAdminAccess(credential.user))) {
            await f.signOut(f.auth);
            status.textContent = 'У этого аккаунта нет прав администратора.';
            return;
          }
          resolve(true);
        } catch (error) {
          status.textContent = 'Не удалось войти: ' + (error.code || error.message);
        }
      };
    });
  }

  async function save(collectionName, id, data) {
    const f = await waitFirebase();
    const docId = collectionName === 'adminGuests' ? key(id) : String(id);
    await f.setDoc(f.doc(f.db, collectionName, docId), {...data, updatedAt: f.serverTimestamp()}, {merge: true});
  }

  async function readCloud() {
    try {
      const f = await waitFirebase();
      const adminGuestDocs = await f.getDocs(f.collection(f.db, 'adminGuests'));
      const deletedGuests = new Map();
      adminGuestDocs.forEach(snap => {
        const guest = snap.data();
        if (guest.deleted || guest.refusal) deletedGuests.set(snap.id, Date.parse(guest.deletedAt) || Infinity);
      });
      const guests = baseGuests
        .filter(guest => !deletedGuests.has(key(guest.email || guest.name)))
        .map(guest => ({...guest}));
      const registrations = await f.getDocs(f.collection(f.db, 'registrations'));
      registrations.forEach(snap => {
        const reg = snap.data();
        const createdAt = reg.createdAt?.toMillis ? reg.createdAt.toMillis() : Date.parse(reg.createdAt) || 0;
        (reg.participants || []).forEach((person, participantIndex) => {
          const deletedAt = deletedGuests.get(key(person.email || person.name));
          if (deletedAt !== undefined && createdAt <= deletedAt) return;
          let guest = guests.find(x => x.email && x.email === person.email) || guests.find(x => x.name === person.name);
          if (!guest) { guest = {name: person.name, refusal: false}; guests.push(guest); }
          Object.assign(guest, person, {registrationId: snap.id, participantIndex, beds: reg.beds || [], status: reg.status || 'new'});
        });
      });
      d.guests = guests;
      const roomDocs = await f.getDocs(f.collection(f.db, 'adminRooms'));
      const rooms = baseRooms.map(room => ({...room}));
      roomDocs.forEach(snap => {
        const data = snap.data();
        const roomId = data.roomId || snap.id;
        const index = rooms.findIndex(x => x.roomId === roomId || key(x.roomId) === snap.id);
        if (data.deleted) { if (index >= 0) rooms.splice(index, 1); return; }
        const cleanRoom = {...data, roomId, beds:Number(data.beds)||2, g1:'', g2:'', g3:'', g4:''};
        if (index >= 0) Object.assign(rooms[index], cleanRoom);
        else rooms.push(cleanRoom);
      });
      d.rooms = rooms;
      return registrations;
    } catch (error) { console.error(error); toast('Firebase: ' + (error.message || 'не удалось загрузить данные')); return null; }
  }

  function registrationForBed(registrations, bedId) {
    for (const reg of registrations || []) {
      const data = reg.data();
      if ((data.beds || []).includes(bedId)) return {id: reg.id, data};
    }
    return null;
  }

  function placeInfo(room, n, registrations, locks) {
    const bedId = room.roomId + '-' + n;
    const lock = locks[bedId];
    if (lock && lock.type === 'admin') return {state:'admin', action:'unlock-admin', text:'заблокировано · ' + (lock.name || 'администратор'), note:lock.note || '', button:'Разблокировать'};
    if (lock && lock.type === 'selection' && lock.expiresAt > Date.now()) return {state:'selection', action:'clear-selection', text:'Ожидается отправка заявки', note:lock.email || '', button:'Освободить'};
    if (lock && (lock.type === 'occupied' || lock.type === 'payment')) return {state:'busy', action:'release-occupied', text:'Заселён · ' + (lock.name || lock.email || 'участник'), note:lock.email || '', button:'Освободить'};
    const registration = registrationForBed(registrations, bedId);
    if (registration) return {state:'busy', action:'release-occupied', text:'Заселён · ' + (registration.data.participants || []).map(x => x.name).filter(Boolean).join(', '), note:registration.data.loginEmail || '', button:'Освободить'};
    const name = room['g' + n];
    return name ? {state:'busy', action:'release-local', text:'Заселён · ' + name, note:'локальная запись', button:'Освободить'} : {state:'free', action:'block-admin', text:'Свободно', note:'', button:'Заблокировать'};
  }

  async function cloudPlacement() {
    const f = await waitFirebase();
    const [registrations, lockDocs] = await Promise.all([f.getDocs(f.collection(f.db, 'registrations')), f.getDocs(f.collection(f.db, 'placeLocks'))]);
    const locks = {};
    const expired = [];
    lockDocs.forEach(x => {
      const lock = x.data();
      if (lock.type === 'selection' && (!lock.expiresAt || lock.expiresAt <= Date.now())) {
        expired.push(f.deleteDoc(f.doc(f.db, 'placeLocks', x.id)));
        return;
      }
      locks[x.id] = lock;
    });
    if (expired.length) await Promise.all(expired);
    return {registrations: registrations.docs, locks};
  }

  async function handlePlaceAction(room, place, placement) {
    const f = await waitFirebase();
    const bedId = room.roomId + '-' + place;
    const info = placeInfo(room, place, placement.registrations, placement.locks);
    try {
      if (info.action === 'unlock-admin' || info.action === 'clear-selection') {
        await f.deleteDoc(f.doc(f.db, 'placeLocks', bedId));
        toast(info.action === 'unlock-admin' ? 'Блокировка снята' : 'Место освобождено');
      } else if (info.action === 'release-occupied') {
        if (!confirm('Освободить место ' + bedId + '? Оно будет удалено из заявки.')) return;
        const lock = placement.locks[bedId];
        const registration = lock?.registrationId
          ? placement.registrations.find(reg => reg.id === lock.registrationId)
          : registrationForBed(placement.registrations, bedId);
        if (registration) {
          const data = registration.data();
          await f.updateDoc(f.doc(f.db, 'registrations', registration.id), {beds:(data.beds || []).filter(x => x !== bedId), updatedAt:f.serverTimestamp()});
        }
        await f.deleteDoc(f.doc(f.db, 'placeLocks', bedId));
        toast('Место освобождено');
      } else if (info.action === 'release-local') {
        room['g' + place] = '';
        await save('adminRooms', room.roomId, room);
        toast('Место освобождено');
      } else {
        const name = prompt('Кто блокирует место? Имя и фамилия:','');
        if (name === null) return;
        const note = prompt('Комментарий:','') || '';
        await save('placeLocks', bedId, {type:'admin',name:name || 'Команда',note,roomId:room.roomId,place});
        toast('Место заблокировано');
      }
      await readCloud();
      render('rooms');
    } catch(error) {
      toast('Ошибка: ' + (error.code || error.message));
    }
  }

  function render(view = 'dashboard') {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view));
    title.textContent = ({dashboard:'Дашборд', guests:'Участники', rooms:'Размещение', settings:'Настройки'}[view] || view);
    ({dashboard, guests, rooms, settings}[view] || dashboard)();
  }

  async function dashboard() {
    const occupied = d.rooms.reduce((n, r) => n + ['g1','g2','g3','g4'].filter(x => r[x]).length, 0);
    const total = d.rooms.reduce((n, r) => n + Number(r.beds || 0), 0);
    let waiting = 0;
    try {
      const f = await waitFirebase();
      const locks = await f.getDocs(f.collection(f.db, 'placeLocks'));
      locks.forEach(snap => { const lock = snap.data(); if (lock.type === 'selection' && lock.expiresAt > Date.now()) waiting += 1; });
    } catch {}
    app.innerHTML = `<div class="grid metrics"><div class="metric"><div class="metric-label">Участники</div><div class="metric-value">${d.guests.filter(x => !x.refusal).length}</div><div class="metric-note">из заявок Firebase</div></div><div class="metric"><div class="metric-label">Места</div><div class="metric-value">${occupied} / ${total}</div><div class="metric-note">занято</div></div><div class="metric"><div class="metric-label">Ожидается отправка заявки</div><div class="metric-value">${waiting}</div><div class="metric-note">временно выбранные места</div></div></div><div class="panel"><div class="panel-head"><h2>Размещение</h2><button class="link" data-go="rooms">Открыть базу комнат →</button></div><p class="sub">Данные обновляются из Firebase.</p></div>`;
    document.querySelector('[data-go]')?.addEventListener('click', () => render('rooms'));
  }

  function guests() {
    const list = d.guests.filter(x => !x.refusal);
    app.innerHTML = `<div class="panel"><div class="panel-head"><h2>Участники</h2><button class="primary" id="reload-guests">Обновить</button></div><div class="table-wrap"><table class="table"><thead><tr><th>ФИО</th><th>Email</th><th>Город / страна</th><th>Место</th><th></th></tr></thead><tbody>${list.map((g, i) => `<tr><td class="name">${esc(g.name)}</td><td>${esc(g.email)}</td><td>${esc(g.city)} / ${esc(g.country)}</td><td>${esc((g.beds || []).join(', '))}</td><td><button class="edit-button edit-guest" data-index="${d.guests.indexOf(g)}">Редактировать</button> <button class="edit-button delete-guest" data-index="${d.guests.indexOf(g)}">Удалить</button></td></tr>`).join('')}</tbody></table></div></div>`;
    document.querySelector('#reload-guests').onclick = async () => { await readCloud(); render('guests'); };
    document.querySelectorAll('.edit-guest').forEach(button => button.onclick = () => editGuest(d.guests[Number(button.dataset.index)]));
    document.querySelectorAll('.delete-guest').forEach(button => button.onclick = () => deleteGuest(d.guests[Number(button.dataset.index)]));
  }

  async function deleteGuest(g) {
    if (!confirm('Удалить участника ' + (g.name || g.email || '') + '?')) return;
    try {
      const f = await waitFirebase();
      if (g.registrationId) {
        const registrationRef = f.doc(f.db, 'registrations', g.registrationId);
        const registrationSnap = await f.getDoc(registrationRef);
        const registration = registrationSnap.exists() ? registrationSnap.data() : null;
        const people = [...((registration && registration.participants) || [])];
        const index = people.findIndex(person => (g.email && person.email === g.email) || (!g.email && person.name === g.name));
        const target = index >= 0 ? index : Number(g.participantIndex);
        if (people.length > 1 && target >= 0 && target < people.length) {
          people.splice(target, 1);
          await f.updateDoc(registrationRef, {participants: people, updatedAt: f.serverTimestamp()});
        } else if (registration) {
          const beds = registration.beds || g.beds || [];
          await f.deleteDoc(registrationRef);
          await Promise.all(beds.map(bed => f.deleteDoc(f.doc(f.db, 'placeLocks', bed))));
        }
      }
      await save('adminGuests', g.email || g.name, {name:g.name || '', email:g.email || '', refusal:true, deleted:true, deletedAt:new Date().toISOString()});
      await readCloud();
      render('guests'); toast('Участник удалён');
    } catch (error) { toast('Ошибка удаления: ' + error.message); }
  }

  function editGuest(g) {
    const modal = document.createElement('div'); modal.className = 'edit-modal'; modal.style = 'position:fixed;inset:0;background:#20252a66;display:grid;place-items:center;padding:20px;z-index:30';
    modal.innerHTML = `<form class="edit-dialog" style="width:min(700px,100%);max-height:90vh;overflow:auto;background:#fffdfb;border-radius:14px;padding:22px"><h2>Редактирование участника</h2><div class="fields">${[['name','ФИО'],['spirit','Духовное имя'],['email','Email'],['phone','Телефон'],['age','Возраст'],['city','Город'],['country','Страна'],['tariff','Тариф']].map(([name,label]) => `<div class="field"><label>${label}</label><input name="${name}" value="${esc(g[name])}"></div>`).join('')}<div class="field full"><label>Места через запятую</label><input name="beds" value="${esc((g.beds||[]).join(', '))}"></div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button type="button" class="ghost" data-cancel>Отмена</button><button class="primary">Сохранить</button></div></form>`;
    document.body.appendChild(modal); modal.querySelector('[data-cancel]').onclick = () => modal.remove();
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const fd = new FormData(event.target), fields = ['name','spirit','email','phone','age','city','country','tariff']; fields.forEach(x => g[x] = fd.get(x));
      try { const f = await waitFirebase(); const newBeds=String(fd.get('beds')||'').split(',').map(x=>x.trim()).filter(Boolean); g.beds=newBeds; if (g.registrationId !== undefined) { const snap = await f.getDocs(f.collection(f.db, 'registrations')); const found = snap.docs.find(x => x.id === g.registrationId); if (found) { const reg = found.data(), people = [...(reg.participants || [])]; people[g.participantIndex] = {...people[g.participantIndex], ...Object.fromEntries(fields.map(x => [x, g[x]]))}; await f.updateDoc(f.doc(f.db, 'registrations', g.registrationId), {participants:people, beds:newBeds, updatedAt:f.serverTimestamp()}); } } await save('adminGuests', g.email || g.name, g); modal.remove(); await readCloud(); render('guests'); toast('Изменения сохранены'); } catch (error) { toast('Ошибка сохранения: ' + error.message); }
    };
  }

  async function rooms() {
    let placement; try { placement = await cloudPlacement(); } catch { placement = {registrations:[], locks:{}}; }
    const roomCards = d.rooms.map((r, ri) => {
      const places = Array.from({length:Number(r.beds)||2}, (_, i) => {
        const p = placeInfo(r, i + 1, placement.registrations, placement.locks);
        const free = p.state === 'free';
        return `<div class="admin-place ${free ? 'admin-place-free' : 'admin-place-busy'}" style="border:1px solid var(--line);border-radius:9px;padding:10px;background:${p.state==='busy'||p.state==='selection'?'#f1f0ed':p.state==='admin'?'#fff0e0':'#fff'}"><b>Место ${i+1}</b><div class="sub">${esc(p.text)}</div>${p.note?`<div class="sub">${esc(p.note)}</div>`:''}<button class="edit-button place-action" data-room="${ri}" data-place="${i+1}">${esc(p.button)}</button></div>`;
      }).join('');
      const freeCount = Array.from({length:Number(r.beds)||2}, (_, i) => placeInfo(r, i + 1, placement.registrations, placement.locks)).filter(p => p.state === 'free').length;
      return `<div class="room-card"><div class="room-top"><div><div class="room-id">${esc(r.roomId)}</div><div class="room-hotel">${esc(r.hotel)} · ${esc(r.tariff)}</div></div><span class="badge ${freeCount ? 'green' : 'rose'}">${freeCount} из ${Number(r.beds)||2} свободно</span></div><div class="room-sectors" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${places}</div><button class="edit-button edit-room" data-room="${ri}" style="margin-top:12px">Изменить номер</button></div>`;
    }).join('');
    app.innerHTML = `<div class="panel"><div class="panel-head"><div><h2>База комнат</h2><p class="sub">Номера показаны так же, как участнику: каждое место отмечено как «Заселён» с именем или «Свободно».</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ghost" id="clear-expired">Очистить зависшие</button><button class="primary" id="reload-rooms">Обновить</button></div></div><div class="grid room-grid">${roomCards}</div></div>`;
    document.querySelector('#reload-rooms').onclick = async () => { await readCloud(); render('rooms'); };
    document.querySelector('#clear-expired').onclick = async () => { try { placement = await cloudPlacement(); render('rooms'); toast('Зависшие выборы очищены'); } catch(error) { toast('Ошибка очистки: ' + (error.code || error.message)); } };
    document.querySelectorAll('.edit-room').forEach(b => b.onclick = () => editRoom(d.rooms[Number(b.dataset.room)]));
    document.querySelectorAll('.place-action').forEach(b => b.onclick = () => handlePlaceAction(d.rooms[Number(b.dataset.room)], Number(b.dataset.place), placement));
  }

  function editRoom(r) {
    const hotel=prompt('Название отеля:',r.hotel); if(hotel===null)return; const tariff=prompt('Тариф:',r.tariff); if(tariff===null)return; const beds=prompt('Количество мест:',r.beds); if(beds===null)return; const floor=prompt('Этаж:',r.floor || ''); if(floor===null)return;
    save('adminRooms',r.roomId,{...r,hotel,tariff,beds:Number(beds)||2,floor:Number(floor)||1}).then(()=>{Object.assign(r,{hotel,tariff,beds:Number(beds)||2,floor:Number(floor)||1});render('rooms');toast('Комната сохранена')}).catch(e=>toast('Ошибка сохранения: '+e.message));
  }

  function settings(){
    app.innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Отели и тарифы</h2><p class="sub">Редактируйте и сохраняйте каждую комнату.</p></div><button class="primary" id="new-room">+ Добавить</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Отель</th><th>Тариф</th><th>Мест</th><th>Этаж</th><th></th></tr></thead><tbody>${d.rooms.map((r,i)=>`<tr><td><input data-i="${i}" data-k="hotel" value="${esc(r.hotel)}"></td><td><input data-i="${i}" data-k="tariff" value="${esc(r.tariff)}"></td><td><input data-i="${i}" data-k="beds" type="number" min="1" value="${r.beds}"></td><td><input data-i="${i}" data-k="floor" value="${esc(r.floor)}"></td><td><button class="edit-button save-room" data-i="${i}">Сохранить</button> <button class="edit-button delete-room" data-i="${i}">Удалить</button></td></tr>`).join('')}</tbody></table></div></div>`;
    document.querySelectorAll('[data-k]').forEach(input=>input.oninput=()=>{const r=d.rooms[Number(input.dataset.i)];r[input.dataset.k]=input.dataset.k==='beds'||input.dataset.k==='floor'?Number(input.value)||1:input.value});
    document.querySelectorAll('.save-room').forEach(b=>b.onclick=async()=>{try{const r=d.rooms[Number(b.dataset.i)];await save('adminRooms',r.roomId,r);toast('Сохранено')}catch(e){toast('Ошибка: '+e.message)}});
    document.querySelectorAll('.delete-room').forEach(b=>b.onclick=async()=>{const r=d.rooms[Number(b.dataset.i)];if(!confirm('Удалить комнату '+r.roomId+'?'))return;try{const f=await waitFirebase();await save('adminRooms',r.roomId,{roomId:r.roomId,deleted:true});await Promise.all(Array.from({length:Number(r.beds)||2},(_,i)=>f.deleteDoc(f.doc(f.db,'placeLocks',r.roomId+'-'+(i+1)))));await readCloud();settings();toast('Комната удалена')}catch(e){toast('Ошибка удаления: '+e.message)}});
    document.querySelector('#new-room').onclick=async()=>{const hotel=prompt('Название отеля:');if(!hotel)return;const tariff=prompt('Тариф:');if(!tariff)return;const r={roomId:'NEW_'+Date.now(),hotel,tariff,beds:2,floor:1,g1:'',g2:'',blockedPlaces:[]};d.rooms.push(r);try{await save('adminRooms',r.roomId,r);settings();toast('Комната добавлена')}catch(e){toast('Ошибка: '+e.message)}};
  }

  document.querySelector('#nav').onclick = e => { const button=e.target.closest('[data-view]'); if(button) render(button.dataset.view); };
  document.querySelector('#refresh').onclick = async () => { await readCloud(); render(document.querySelector('.nav-item.active')?.dataset.view || 'dashboard'); toast('Данные обновлены'); };
  await requireAdmin();
  await readCloud(); render('dashboard');
})();
