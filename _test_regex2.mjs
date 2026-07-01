
import vm from 'node:vm';
const impl = `
    function reverseWords(s) {
      return s.trim().split(/\s+/).filter(Boolean).reverse().join(" ");
    }
  `;
console.log('String bytes at split(/:', [...impl].slice(impl.indexOf('split(/'), impl.indexOf('split(/')+12).map(c => c.charCodeAt(0).toString(16)));
const sb = vm.createContext({});
try {
  const r = vm.runInContext(impl + '
;reverseWords("hello world")', sb, { timeout: 1000 });
  console.log('VM result:', JSON.stringify(r));
} catch(e) {
  console.log('VM threw:', e.message);
}
