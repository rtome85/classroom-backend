import express from 'express';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Classroom Backend API' });
});

// Start server
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server is running at ${url}`);
});
