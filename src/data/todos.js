// In-memory data store for todos
// Replace this with a real database (e.g. MongoDB, PostgreSQL) in production

let todos = [
  {
    id: "1",
    title: "Buy groceries",
    description: "Milk, eggs, bread, and coffee",
    completed: false,
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Read a book",
    description: "Finish reading 'Clean Code'",
    completed: false,
    priority: "low",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

module.exports = todos;
