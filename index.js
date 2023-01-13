require('dotenv').config();
const AWS = require('aws-sdk');
const fetch = require('node-fetch')
const _ = require('lodash')
const moment = require('moment')

const aws_remote_config = {
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.REGION
}

var params = {
    ExpressionAttributeValues: {
        ':c': process.env.CONTRACT_ADDRESS,
        ':m': false
    },
    KeyConditionExpression: 'contractAddress = :c',
    FilterExpression: 'metadataAvailable = :m',
    TableName: process.env.TABLE_NAME
}

async function queryItems(client, params) {
    try {
        return client.query(params).promise()
    } catch(err) {
        return err
    }
}

AWS.config.update(aws_remote_config)
const client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
async function main() {
    const results = await queryItems(client, params)
    console.log(results)

    //check if metadata is available for the corresponding item

    if(results?.Items) {
        const responses = _.map(results?.Items, async function(item) {
            //attempt to fetch metadata of that item
            const talkoTokenMetadata = 'https://api.talkoapp.io/metadata/' + process.env.CONTRACT_ADDRESS + '/' + item.tokenId
            const metadataresponse = await fetch(talkoTokenMetadata)
            if (metadataresponse?.ok) {
                const data = await metadataresponse.json()
                console.log(data)
                item['metadataAvailable'] = true
                
                //attempt to update socials
            }
        })
    }
    console.log(results)
}


main()
//query items from a specific dynamodb table that have certain contract address as the primary key and that has metadata set as false
//query backend for availability of metadata
//if metadata available, and update socials
//if metadata available, update the metadata availability to dynamodb table, update if posted to socials





