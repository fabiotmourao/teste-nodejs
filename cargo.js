const db = require('./db/database');

db.select('*').from('cargo')
.then(data => {
  console.log(data);
})
.catch(err => {
  console.error('Erro na consulta:', err);
});
