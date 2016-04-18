/**
 * Copyright (c) 2016 Jeremy Thomerson
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('underscore'),
    AWS = require('aws-sdk'),
    redis = require('redis');

exports.handler = function(event, context, callback) {
   var method = event.context['http-method'].toUpperCase(),
       elasticache = new AWS.ElastiCache({apiVersion: '2015-02-02'});

   elasticache.describeCacheClusters({ CacheClusterId: event.custom.ElastiCacheCluster, ShowCacheNodeInfo: true }, function(err, data) {
      if (err) {
         return callback('Error getting cache cluster config: ' + err);
      }

      console.log('got data', data);
      event.CacheHost = data.CacheClusters[0].CacheNodes[0].Endpoint.Address;
      console.log('connect to', event.CacheHost);

      switch (method) {
         case 'GET':
            handleGet(event, context, callback);
            break;
         case 'POST':
            handlePost(event, context, callback);
            break;
         default:
            callback('Unsupported method');
      }
   });
};

function handleGet(event, context, callback) {
   callback('GET not yet implemented');
}

function handlePost(event, context, callback) {
   var client = redis.createClient({ host: event.CacheHost }),
       userID = event['body-json'].userID,
       gameID = event['body-json'].gameID,
       score = event['body-json'].score;

   client.on('error', function(err) {
      console.log('Error ' + err);
   });

   if (_.isEmpty(userID) || _.isEmpty(gameID)) {
      // send 'event' back for debugging - not something you'd do in real code
      callback('Must supply "userID" and "gameID"', event);
      client.quit();
   } else {
      var args = [ gameID, score, userID ];

      client.zadd(args, function(err, response) {
         callback(err, { redisResp: response });
         client.quit();
      });
   }
}
