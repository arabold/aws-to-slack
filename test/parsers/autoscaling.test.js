/* eslint-disable */

require("./_parser")
	.named("autoscaling")
	.matchesEvent({ Records: [{
		"EventVersion": "1.0",
		"EventSubscriptionArn": `arn:aws:sns:region:account-id:topicname:subscriptionid`,
		"EventSource": "aws:sns",
		"Sns": {
			"SignatureVersion": "1",
			"Timestamp": "1970-01-01T00:00:00.000Z",
			"Signature": "EXAMPLE",
			"SigningCertUrl": "EXAMPLE",
			"MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
			"Message": `{"AccountId":"849571656326","RequestId":"bad2bfb5-0a61-11e9-aed0-a14d1975b70c","AutoScalingGroupARN":"arn:aws:autoscaling:us-east-1:849571656326:autoScalingGroup:d4a75f82-0970-4761-80f8-8ebc4999761d:autoScalingGroupName/revo-ecs-cluster-AutoScalingGroup-6TD45WIULWSY","AutoScalingGroupName":"revo-ecs-cluster-AutoScalingGroup-6TD45WIULWSY","Service":"AWS Auto Scaling","Event":"autoscaling:TEST_NOTIFICATION","Time":"2018-12-28T05:30:47.704Z"}`,
			"MessageAttributes": {
				"Test": {
					"Type": "String",
					"Value": "TestString"
				},
				"TestBinary": {
					"Type": "Binary",
					"Value": "TestBinary"
				}
			},
			"Type": "Notification",
			"UnsubscribeUrl": "EXAMPLE",
			"TopicArn": `arn:aws:sns:region:account-id:topicname`,
			"Subject": "TestInvoke"
		}
	}] });
