require('dotenv').config();
const express = require('express');
const  { updateRepos }= require('./gatewayManager');
const app = express();
const port = process.env.PORT || 3000;

app.post('/api/gateway-manager', async (req,res) =>{
    try{
        const result = await updateRepos();
        res.status(200).json({ message: result.message })
    }catch(error){
        console.error(`Error updating repositories: ${error.message}`)
        res.status(500).json({ error: error.message })
    }
})

app.listen(port,() =>{
    console.log(`Gateway Manager API running on port ${port}`);
})
