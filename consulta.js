const db = require('./db/database');

db.select('*').from('usuario')
.then(data => {
  console.log(data);
})
.catch(err => {
  console.error('Erro na consulta:', err);
});
