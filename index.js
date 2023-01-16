require('dotenv').config();
const AWS = require('aws-sdk');
const fetch = require('node-fetch')
const _ = require('lodash')
const moment = require('moment')
const {TwitterApi} = require('twitter-api-v2')

const aws_remote_config = {
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.REGION
}

const twitter_config = {
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
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
const twitterClient = new TwitterApi(twitter_config)

async function main() {
    const results = await queryItems(client, params)  // fetch infromation on available tokens from dynamodb
    if(results?.Items) {
        const responses = _.map(results?.Items, async function(item) {
            const talkoTokenMetadata = 'https://api.talkoapp.io/metadata/' + process.env.CONTRACT_ADDRESS + '/' + item.tokenId
            const metadataresponse = await fetch(talkoTokenMetadata)    // fetch metadata of a token
            
            if (metadataresponse?.ok) {
                const data = await metadataresponse.json()
                console.log(data)
                item['metadataAvailable'] = true
                const receiverMetadataObj = _.find(data?.attributes, function(o) {return o.trait_type == 'Receiver'})   // find receiver from metadata attributes
                const tweetMsg = 'New Streamr Award token has been minted! Congratulations ' + receiverMetadataObj?.value; 

                const image = await fetch(data?.image)  // fetch image associated to metadata
                const imageBuffer = Buffer.from(await image.arrayBuffer()) 

                const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {type: 'png'})  // upload image to twitter, receive media id
                //load the metadata image to buffer
                //refactor to try catch, async await
                twitterClient.v1.tweet(tweetMsg, {media_ids: mediaId}).then((val) => {   // post tweet to twitter
                    console.log(val)
                    console.log("success")
                }).catch((err) => {
                    console.log(err)
                })

                
                //attempt to update socials
                //load metadata image to buffer
                //draft a tweet
                //New Streamr Award token has been minted! Congratulations <RECEIVER> 
                //append image to tweet

                //update that metadata is available 
                //update that metadata has been updated  to twitter
                //update that metadata has been updated to discord


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





