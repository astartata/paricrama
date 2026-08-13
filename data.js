// Демо-слой данных. На следующем шаге заменяется адаптером Firebase.
// Правила размещения: genderLock заполняется первой подтвержденной бронью;
// privateRoom=true означает оплату всех beds мест одним участником/группой.
window.PLACEMENT_RULES={genderLockMode:'first-confirmed',allowPrivateRoom:true,priceMode:'beds-count',sameGenderOnly:true};
window.PARIKRAMA_DATA={
 guests:[],
 rooms:[
  {hotel:'Шри Рупа Сева Кундж',tariff:'Премиум 2-местный Этаж 1',roomId:'01_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false},
  {hotel:'Шри Рупа Сева Кундж',tariff:'Премиум 2-местный Этаж 1',roomId:'02_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false},
  {hotel:'Шри Рупа Сева Кундж',tariff:'Комфорт+ 2-местный',roomId:'03_SRSK',beds:2,floor:1,g1:'',g2:'',blocked:false}
 ],
 placementUnits:[{id:'01_SRSK-1',roomId:'01_SRSK',label:'койка 1',free:true},{id:'01_SRSK-2',roomId:'01_SRSK',label:'койка 2',free:true},{id:'02_SRSK-1',roomId:'02_SRSK',label:'койка 1',free:true},{id:'03_RUKM-1',roomId:'03_RUKM',label:'койка 1',free:true}],
 payments:[],
 children:[],
 team:[],vip:[],messages:[]
};
