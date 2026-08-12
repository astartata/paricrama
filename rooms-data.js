(function(){
  const rooms=[];
  const add=(hotel,tariff,prefix,from,to,beds,floor,extra={})=>{for(let n=from;n<=to;n++){const roomId=String(n).padStart(2,'0')+'_'+prefix;rooms.push({hotel,tariff,roomId,beds,floor,g1:'',g2:'',g3:'',g4:'',blocked:false,blockedPlaces:[],...extra[roomId]})}};
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 1','SRSK',1,20,2,1,{});
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 2','SRSK',21,22,2,2,{});
  add('Шри Рупа Сева Кундж','Премиум 4-местный Этаж 2','SRSK',23,28,4,2,{});
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 2','SRSK',29,30,2,2,{});
  add('Рукмани Дхам','Комфорт+ 2-местный','Rukm',1,28,2,'',{});
  add('Рукмани Дхам','Комфорт+ 3-местный','Rukm',29,29,3,'',{});
  add('Рукмани Дхам','Комфорт+ 4-местный','Rukm',30,30,4,'',{});
  add('Даудада','Бюджет окна улица','Dau_window',1,10,2,'',{});
  const reserve={};for(let n=1;n<=18;n++)reserve[String(n).padStart(2,'0')+'_Dau_nowindow']={blocked:true,blockedPlaces:[1,2],blockedNote:'резерв'};
  add('Даудада','Бюджет окна коридор','Dau_nowindow',1,18,2,'',reserve);
  window.PARIKRAMA_DATA.rooms=rooms;
})();
