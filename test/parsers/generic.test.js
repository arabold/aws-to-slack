/* eslint-disable */

// The generic parser is intended to match anything that DOES NOT match another parser.
// Update these examples below if they happen to match your custom parser format.

const snsMessageThatMatchesNothing = {
	Records: [{
		"EventVersion": "1.0",
		"EventSubscriptionArn": `arn:aws:sns:region:account-id:topicname:subscriptionid`,
		"EventSource": "aws:sns",
		"Sns": {
			"SignatureVersion": "1",
			"Timestamp": "1970-01-01T00:00:00.000Z",
			"Signature": "EXAMPLE",
			"SigningCertUrl": "EXAMPLE",
			"MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
			"Message": `foo`,
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
	}]
};

const eventThatMatchesNothing = {
	"datasetName": "datasetName",
	"eventType": "SyncTrigger",
	"region": "us-east-1",
	"identityId": "identityId",
	"datasetRecords": {
		"SampleKey2": {
			"newValue": "newValue2",
			"oldValue": "oldValue2",
			"op": "replace"
		},
		"SampleKey1": {
			"newValue": "newValue1",
			"oldValue": "oldValue1",
			"op": "replace"
		}
	},
	"identityPoolId": "identityPoolId",
	"version": 2
};


const mock = require("./_parser_mock").named("generic");
mock.matchesEvent(snsMessageThatMatchesNothing);
mock.matchesEvent(eventThatMatchesNothing);

test(`Parser[generic] will match event and provide detail`, async () => {
	const event = {
		test1: "test89",
		test8: 7,
	};
	const result = await mock.makeNew().parse(event);
	expect(result.attachments[0]).toEqual(expect.objectContaining({
		"ts": expect.any(Number),
		"color": "#A8A8A8",
		"author_name": "<unknown>",
		"fallback": JSON.stringify(event, null, 2),
		"text": [],
		"title": "Raw Event",
		"fields": [
			{"short": true, "title": "test1", "value": "test89"},
			{"short": true, "title": "test8", "value": "7"},
		],
	}));
});
