
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/health', (req, res) => {
    res.json({ status: 'Nestive Core Optimized API running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
