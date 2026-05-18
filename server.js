const app = require("./src/app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`  📝  To-Do API Server`);
  console.log(`  🚀  Running at: http://localhost:${PORT}`);
  console.log(`  📡  API Base:   http://localhost:${PORT}/api/todos`);
  console.log("─────────────────────────────────────────");
});
