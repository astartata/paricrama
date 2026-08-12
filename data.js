// Демо-слой данных. На следующем шаге заменяется адаптером Firebase.
// Правила размещения: genderLock заполняется первой подтвержденной бронью;
// privateRoom=true означает оплату всех beds мест одним участником/группой.
window.PLACEMENT_RULES={genderLockMode:'first-confirmed',allowPrivateRoom:true,priceMode:'beds-count',sameGenderOnly:true};
window.PARIKRAMA_DATA={
 guests:[
  {name:'Max Mari',spirit:'Махирадха',gender:'Женщина',city:'Москва',country:'Россия',tariff:'Премиум 2-местный',room:'',advance:'',remainder:'',refusal:true},
  {name:'Ivanov Ivan',spirit:'Атма д',gender:'Мужчина',city:'Москва',country:'Россия',tariff:'Премиум 2-местный',room:'01_SRSK',advance:'24.11.2026',remainder:'',refusal:false},
  {name:'Петрова Татьяна',spirit:'',gender:'Женщина',city:'Москва',country:'Россия',tariff:'Комфорт+ 2-местный',room:'',advance:'13.11.2026',remainder:'',refusal:false},
  {name:'Inty Ghers',spirit:'',gender:'Мужчина',city:'',country:'',tariff:'Премиум 2-местный',room:'02_SRSK',advance:'',remainder:'',refusal:false},
  {name:'П,п псеме',spirit:'Параметрам прабху',gender:'Мужчина',city:'',country:'',tariff:'',room:'',advance:'',remainder:'',refusal:false}
 ],
 rooms:[
  {hotel:'Шри Рупа Сева Кундж',tariff:'Премиум 2-местный Этаж 1',roomId:'01_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false},
  {hotel:'Шри Рупа Сева Кундж',tariff:'Премиум 2-местный Этаж 1',roomId:'02_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false},
  {hotel:'Шри Рупа Сева Кундж',tariff:'Комфорт+ 2-местный',roomId:'03_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false}
 ],
 placementUnits:[{id:'01_SRSK-1',roomId:'01_SRSK',label:'койка 1',free:true},{id:'01_SRSK-2',roomId:'01_SRSK',label:'койка 2',free:true},{id:'02_SRSK-1',roomId:'02_SRSK',label:'койка 1',free:true},{id:'03_RUKM-1',roomId:'03_RUKM',label:'койка 1',free:true}],
 payments:[{date:'13.11.2026',name:'Петрова Татьяна, Петрова Ольга',amount:32000,currency:'Рубль',receipt:'https://drive.google.com/open?id=1f0HJhMvIzru-b9WRyOnmn6AVS1aOfxaC',comment:'dfghjk'}],
 children:[{parent:'Петрова Татьяна',childName:'Петрова Ольга',age:12,tariff:'Комфорт+ 2-местный',room:'',paid:'13.11.2026'}],
 team:[],vip:[],messages:[{date:'13.11.2026',operator:'bhaktischool.bcs@gmail.com',name:'Ivanov Ivan',channel:'Telegram',topic:'Не зарегистрирован ребёнок 5-14'}]
};
