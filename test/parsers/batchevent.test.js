/* eslint-disable */

const examplebatchevent = {
	"Records": [
		{
			"EventSource": "aws:sns",
			"EventVersion": "1.0",
			"EventSubscriptionArn": "arn:aws:sns:eu-central-1:12321111:sns-topic:686e8012-ac83-42ff-b59b-b9bbd28effbb",
			"Sns": {
				"Type": "Notification",
				"MessageId": "c9be37d3-8487-5988-a5d4-6311bc107dc3",
				"TopicArn": "arn:aws:sns:eu-central-1:12321111:sns-topic",
				"Subject": null,
				"Message": "some message",
				"Timestamp": "2019-01-23T09:39:35.612Z",
				"SignatureVersion": "1",
				"Signature": "",
				"SigningCertUrl": "https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-ac565b8b1a6c5d002d285f9598aa1d9b.pem",
				"UnsubscribeUrl": "https://sns.eu-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-central-1:12321111:sns-topic",
				"MessageAttributes": {}
			}
		}
	]
};

require("./_parser_mock")
	.named("batchEventSns")
	.matchesSnsMessage(examplebatchevent);