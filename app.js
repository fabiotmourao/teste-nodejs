const express = require("express");
const csv = require("csv");
const fs = require("fs");
const db = require("./db/database");
const app = express();


app.post("/export-csv", async (req, res) => {
  const arquivoCSV = "testenodejs.csv";

  const rows = [];

  fs.createReadStream(arquivoCSV)
    .pipe(csv.parse({ delimiter: ";" }))
    .on("data", async (row) => {
      rows.push(row);
    })
    .on("end", async () => {
      for (const row of rows) {
        if (row[2].toUpperCase() === "APROVADA") {
          try {
            const usuario = await db.select("*").from("usuario").where("usuario_cpf", row[0]).first();

            if (usuario && usuario.cargo_id !== null) {
              const cargo = await db.select("*").from("cargo").where("cargo_id", usuario.cargo_id).first();

              await db("pontos").insert({
                usuario_id: usuario.usuario_id,
                pontos_descricao: row[1],
                pontos_qtd: cargo ? cargo.cargo_ponto : 0, 
                pontos_status: row[2],
              });
              console.log(
                "Pontos inseridos para o usuário:",
                usuario.usuario_id
              );
            } else {
              console.log(
                "Usuário não encontrado ou não tem um cargo válido:",
                usuario
              );
            }
          } catch (error) {
            console.error("Erro ao processar linha do CSV:", error);
          }
        } else {
          console.log("Linha não aprovada:", row);
        }
      }

      console.log("Importação concluída.");
      res.send("Importação concluída.");
      db.destroy();
    });
});

app.post("/processar-cargos", async (req, res) => {
  try {
    const masters = await db.select("usuario_id", "cargo_id").from("usuario").whereIn("cargo_id", [4, 5]);

    const totalPontosOutrosUsuarios = await db("pontos")
      .sum("pontos_qtd")
      .whereNotIn("usuario_id", masters.map(master => master.usuario_id))
      .first();
    const pontosOutrosUsuarios = parseFloat(totalPontosOutrosUsuarios['sum("pontos_qtd")'] || 0);

    const pontosGerenteRegional = pontosOutrosUsuarios * 0.2;

    const pontosSupervisorLoja = pontosOutrosUsuarios * 0.35;

    if (masters.length === 0) {
      throw new Error("Não foi possível encontrar ID de GERENTE_REGIONAL ou SUPERVISOR_LOJA.");
    }

    await db("pontos").insert({
      usuario_id: masters.find(master => master.cargo_id === 4).usuario_id,
      pontos_descricao: "Pontos por gerência regional",
      pontos_qtd: pontosGerenteRegional,
      pontos_status: "APROVADA",
    });

    const idsSupervisoresLoja = masters.filter(master => master.cargo_id === 5).map(master => master.usuario_id);
    for (const idSupervisorLoja of idsSupervisoresLoja) {
      await db("pontos").insert({
        usuario_id: idSupervisorLoja,
        pontos_descricao: "Pontos por supervisão de loja",
        pontos_qtd: pontosSupervisorLoja , 
        pontos_status: "APROVADA",
      });
    }

    console.log("Pontos para GERENTE_REGIONAL inseridos:", pontosGerenteRegional);
    console.log("Pontos para SUPERVISOR_LOJA inseridos:", pontosSupervisorLoja);

    res.send("Processamento concluído.");
  } catch (error) {
    console.error("Erro ao processar cargos:", error);
    res.status(500).send("Erro ao processar cargos.");
  }
});


const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
