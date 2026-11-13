export function digits(v){return String(v??'').replace(/\D/g,'')}
export function cpfValid(v){const s=digits(v);if(s.length!==11||/^(\d)\1{10}$/.test(s))return false;for(let k=9;k<11;k++){let sum=0;for(let i=0;i<k;i++)sum+=Number(s[i])*(k+1-i);if(((sum*10)%11)%10!==Number(s[k]))return false;}return true}
export function money(v){const n=Number(v);return Number.isFinite(n)&&n>0&&n<=100000?Math.round(n*100)/100:null}
