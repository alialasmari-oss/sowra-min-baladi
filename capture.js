/* صورة من بلدي — capture.js | نسخة المختبر م1 */
/* ============ EXIF GPS ============ */
function readExifGPS(file){
  return new Promise(resolve=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const v=new DataView(e.target.result);
        if(v.getUint16(0)!==0xFFD8)return resolve(null);
        let off=2;
        while(off<v.byteLength-4){
          if(v.getUint16(off)===0xFFE1){
            const tiff=off+10;
            const little=v.getUint16(tiff)===0x4949;
            const g16=o=>v.getUint16(o,little),g32=o=>v.getUint32(o,little);
            const ifd0=tiff+g32(tiff+4);
            let gpsIFD=0,n=g16(ifd0);
            for(let i=0;i<n;i++){
              const en=ifd0+2+i*12;
              if(g16(en)===0x8825){gpsIFD=tiff+g32(en+8);break}
            }
            if(!gpsIFD)return resolve(null);
            let latRef="N",lngRef="E",lat=null,lng=null;
            const rat=o=>{const p=tiff+g32(o+8);return[g32(p)/g32(p+4),g32(p+8)/g32(p+12),g32(p+16)/g32(p+20)]};
            const gn=g16(gpsIFD);
            for(let i=0;i<gn;i++){
              const en=gpsIFD+2+i*12,tag=g16(en);
              if(tag===1)latRef=String.fromCharCode(v.getUint8(en+8));
              if(tag===3)lngRef=String.fromCharCode(v.getUint8(en+8));
              if(tag===2)lat=rat(en);
              if(tag===4)lng=rat(en);
            }
            if(!lat||!lng)return resolve(null);
            const toD=(a,ref)=>(a[0]+a[1]/60+a[2]/3600)*(ref==="S"||ref==="W"?-1:1);
            return resolve({lat:toD(lat,latRef),lng:toD(lng,lngRef)});
          }
          off+=2+v.getUint16(off+2);
        }
        resolve(null);
      }catch(err){resolve(null)}
    };
    r.readAsArrayBuffer(file.slice(0,256*1024));
  });
}
function liveLocation(){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy)}),
      ()=>resolve(null),
      {enableHighAccuracy:true,timeout:8000,maximumAge:30000}
    );
  });
}
