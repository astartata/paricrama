(function(){
  const rooms=[];
  const add=(hotel,tariff,prefix,from,to,beds,floor,extra={})=>{for(let n=from;n<=to;n++){const id=String(n).padStart(2,'0')+'_'+prefix;rooms.push({hotel,tariff,roomId:id,beds,floor,g1:'',g2:'',blocked:false,blockedPlaces:[],...extra[id]})}};
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 1','SRSK',1,20,2,1,{ '03_SRSK':{g1:'Калпатару дд',g2:'Никунджа Вихарини дд'},'07_SRSK':{g1:'Лила Павани дд',g2:'Дочка Лила Павани дд'},'10_SRSK':{g1:'Санкаршан д',g2:'Слуга Санкаршан д'},'11_SRSK':{g1:'Лила Шакти дд ЮАР'},'12_SRSK':{g1:'Радха Тхакурани дд ЮАР'},'13_SRSK':{g1:'Шачи Деви дд ЮАР'},'14_SRSK':{g1:'Варшана Рани дд',g2:'муж Варшаны Рани'},'15_SRSK':{g1:'Сукумари дд'},'16_SRSK':{g1:'Ом Пурнам дд',g2:'Хари Крипа дд'}});
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 2','SRSK',21,22,2,2,{});
  add('Шри Рупа Сева Кундж','Премиум 4-местный Этаж 2','SRSK',23,28,4,2,{});
  add('Шри Рупа Сева Кундж','Премиум 2-местный Этаж 2','SRSK',29,30,2,2,{'30_SRSK':{g1:'Махапрабху Крипа Д',g2:'Вриндарани Дд'}});
  add('Рукмани Дхам','Комфорт+ 2-местный','Rukm',1,28,2,'',{'01_Rukm':{g1:'Петрова Татьяна',g2:'Петрова Ольга'}});
  add('Рукмани Дхам','Комфорт+ 3-местный','Rukm',29,29,3,'',{'29_Rukm':{g1:'Ivanov Oleg',g2:'Ivanova Olga',g3:'Ivanov Vasilii'}});
  add('Рукмани Дхам','Комфорт+ 4-местный','Rukm',30,30,4,'',{});
  add('Даудада','Бюджет окна улица','Dau_window',1,10,2,'',{'01_Dau_window':{g1:'Акинчана д',g2:'Махалакшми дд'}});
  const reserve={};for(let n=1;n<=18;n++)reserve[String(n).padStart(2,'0')+'_Dau_nowindow']={blocked:true,blockedPlaces:[1,2],blockedNote:'резерв'};
  add('Даудада','Бюджет окна коридор','Dau_nowindow',1,18,2,'',reserve);
  window.PARIKRAMA_DATA.rooms=rooms;
})();
