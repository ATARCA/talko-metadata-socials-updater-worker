require('dotenv').config();
const AWS = require('aws-sdk');
const fetch = require('node-fetch')
const _ = require('lodash')
const moment = require('moment')
const {TwitterApi} = require('twitter-api-v2')
const {WebhookClient, EmbedBuilder} = require('discord.js');
const { update } = require('lodash');
const {updateMetadata, updateDiscord, updateTwitter, updateItems, queryItems} = require('./helpers')
const {twitter_config, aws_remote_config} = require('./configs')

//refactor: find all tokens that have twitter or discord set to false or their metadata is false (it may now be available)
var params = {
    ExpressionAttributeValues: {
        ':c': process.env.CONTRACT_ADDRESS,
        ':m': false
    },
    KeyConditionExpression: 'contractAddress = :c',
    FilterExpression: 'metadataAvailable = :m OR twitter = :m OR discord = :m',
    TableName: process.env.TABLE_NAME
}

//test updating the metadata availability parameter after retrieval of metadata
//create update functions for social media updates
//refactor

AWS.config.update(aws_remote_config)
const client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
const twitterClient = new TwitterApi(twitter_config)
const discordWebhookClient = new WebhookClient({url: process.env.WEBHOOK_URL})

//find all tokens that have metadata set as false, or their discord or twitter is false

async function main() {
    const results = await queryItems(client, params)  // fetch infromation on available tokens from dynamodb
    if(results?.Items) {
        const responses = _.map(results?.Items, async function(item) {
            const talkoTokenMetadata = 'https://api.talkoapp.io/metadata/' + process.env.CONTRACT_ADDRESS + '/' + item.tokenId
            const talkoTokenURI = 'https://talkoapp.io/token/' + process.env.CONTRACT_ADDRESS + '/' + item.tokenId
            const metadataresponse = await fetch(talkoTokenMetadata)    // fetch metadata of a token
            
            if (metadataresponse?.ok) {
                const data = await metadataresponse.json()
                const imageURI = data?.image
                const updateMetadataParam = updateMetadata(item.tokenId, true)
                const updateTwitterParam = updateTwitter(item.tokenId, true)
                const updateDiscordParam = updateDiscord(item.tokenId, true) 
                await updateItems(client, updateMetadataParam)
                const receiverMetadataObj = _.find(data?.attributes, function(o) {return o.trait_type == 'Receiver'})   // find receiver from metadata attributes
                const categoryMetadataObj = _.find(data?.attributes, function(o) {return o.trait_type == 'Category'})
                const tweetMsg = 'New Streamr Award token has been minted! Congratulations ' + receiverMetadataObj?.value + '. Checkout it out at ' +talkoTokenURI;
                const image = await fetch(imageURI)  // fetch image associated to metadata
                const imageBuffer = Buffer.from(await image.arrayBuffer()) 
                const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {type: 'png'})  // upload image to twitter, receive media id
                if (!item?.twitter) {
                    try {
                        await twitterClient.v1.tweet(tweetMsg, {media_ids: mediaId})
                        await updateItems(client, updateTwitterParam)
                    }
                    catch(err) {
                        console.log('Failed to tweet tokenId: '+item.tokenId, err)
                    }
                }
                
                if (!item?.discord) {
                    const embed = new EmbedBuilder()
                    embed
                    .setTitle('New award token has been minted')
                    .setColor(0x00FFFF)
                    .setURL(talkoTokenURI)
                    .setDescription(data?.name)
                    .setThumbnail(imageURI)
                    .addFields(
                        { name: 'Receiver', value: receiverMetadataObj?.value },
                        { name: 'Award Category', value: categoryMetadataObj?.value },
                        { name: 'Mint block', value: item?.mintBlock },
                        { name: 'View token at Talko platform', value: talkoTokenURI }
                    )
                    //update discord only if discord was false
                    try {
                        await discordWebhookClient.send({
                            content: '',
                            username: 'Talko-Bot',
                            avatarURL: 'https://images.talkoapp.io/discord_bot_1.png',
                            embeds: [embed]
                        })
                        await updateItems(client, updateDiscordParam)

                    } catch(err) {
                        console.log('Failed to update discord on tokenId: ' + item.tokenId, err)
                    }
                }
            }
        })
    }
    console.log(results)
}
main()