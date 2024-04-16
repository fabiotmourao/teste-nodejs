const db = require('./db/database');

db.select('*').from('pontos')
.then(data => {
  console.log(data);
})
.catch(err => {
  console.error('Erro na consulta:', err);
});
