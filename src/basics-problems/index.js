// 🧱 Програмчлалын суурийн анхдагч бодлогууд: хичээл бүрт 2 хялбар бодлого.
// Тестийг генератор + JS шийдлээр үүсгэнэ (src/cp-problems-ийн механизм). Багш устгасныг дахин үүсгэхгүй.
const { seedProblems } = require('../cp-problems');

const PROBLEMS = require('./lessons');

const seedBasicsProblems = () => seedProblems(PROBLEMS, 'basicsProblemKeys', 'Програмчлалын суурь');

module.exports = { PROBLEMS, seedBasicsProblems };
