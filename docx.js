/* minimalny generator DOCX (zip bez kompresji) */
(function(root){
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zip(files){const enc=new TextEncoder();const parts=[],cd=[];let off=0;
 for(const [name,str] of files){const n=enc.encode(name),d=enc.encode(str),c=crc32(d);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,n.length,true);
  parts.push(new Uint8Array(h.buffer),n,d);
  const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint32(16,c,true);e.setUint32(20,d.length,true);e.setUint32(24,d.length,true);e.setUint16(28,n.length,true);e.setUint32(42,off,true);
  cd.push(new Uint8Array(e.buffer),n);off+=30+n.length+d.length}
 const cds=cd.reduce((a,b)=>a+b.length,0);const z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,files.length,true);z.setUint16(10,files.length,true);z.setUint32(12,cds,true);z.setUint32(16,off,true);
 const all=[...parts,...cd,new Uint8Array(z.buffer)];const out=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let p=0;for(const a of all){out.set(a,p);p+=a.length}return out}
const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const P=(t,o={})=>`<w:p>${o.h?`<w:pPr><w:pStyle w:val="Heading${o.h}"/></w:pPr>`:''}<w:r>${o.b||o.h?'<w:rPr><w:b/>'+(o.h?'<w:sz w:val="'+(o.h==1?32:26)+'"/>':'')+'</w:rPr>':''}<w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
const T=rows=>`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(b=>`<w:${b} w:val="single" w:sz="4" w:color="999999"/>`).join('')}</w:tblBorders></w:tblPr>${rows.map(r=>'<w:tr>'+r.map(c=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${x(c)}</w:t></w:r></w:p></w:tc>`).join('')+'</w:tr>').join('')}</w:tbl>`;
function build(blocks){const body=blocks.map(b=>b.table?T(b.table):P(b.text,b)).join('');
 return zip([['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
 ['word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>']])}
const API={build,crc32,zip};if(typeof module!=='undefined')module.exports=API;else root.DOCX=API;
})(this);
