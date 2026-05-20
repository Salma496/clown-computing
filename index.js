const express = require('express')
const app = express()
const PORT = 3000

app.use(express.json())

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Clown Computing server running on port ${PORT}`)
})