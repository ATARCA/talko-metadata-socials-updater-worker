require('dotenv').config();

function updateMetadata(tokenId, boolean)  { 
    return {
        TableName: process.env.TABLE_NAME,
        Key: {
            contractAddress: process.env.CONTRACT_ADDRESS,
            tokenId: tokenId
        },
        UpdateExpression: 'set metadataAvailable = :m',
        ExpressionAttributeValues: {
            ':m': boolean
        }
    }
}

function updateDiscord(tokenId, boolean) {
    return {
        TableName: process.env.TABLE_NAME,
        Key: {
            contractAddress: process.env.CONTRACT_ADDRESS,
            tokenId: tokenId
        },
        UpdateExpression: 'set discord = :m',
        ExpressionAttributeValues: {
            ':m': boolean
        }
    }
}

function updateTwitter(tokenId, boolean) {
    return {
        TableName: process.env.TABLE_NAME,
        Key: {
            contractAddress: process.env.CONTRACT_ADDRESS,
            tokenId: tokenId
        },
        UpdateExpression: 'set twitter = :m',
        ExpressionAttributeValues: {
            ':m': boolean
        }
    }
}

async function updateItems(client, params) {
    try {
        return client.update(params).promise()
    } catch(err) {
        return err
    }
}

async function queryItems(client, params) {
    try {
        return client.query(params).promise()
    } catch(err) {
        return err
    }
}

module.exports = {updateMetadata, updateDiscord, updateTwitter, updateItems, queryItems }