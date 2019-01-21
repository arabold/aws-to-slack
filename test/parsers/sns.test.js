/* eslint-disable */

const mock = require("./_parser").named("sns");
const parser = require(`../../src/parsers/sns`);

test(`Parser[${mock.name}] exists`, () => {
	expect(parser).toEqual(expect.any(Function));
	expect(parser.prototype)
		.toEqual(expect.objectContaining({ parse: expect.any(Function) }));
});

const instance = mock.makeNew();

test(`Parser[${mock.name}] exists`, async () => {
	function rand(digits) {
		return String(Math.random() * 100000000).substr(0, digits);
	}

	const message = {
		"foo": "bar",
	};

	const event = {
		Records: [{
			"EventSource": "aws:sns",
			"EventVersion": "1.0",
			"EventSubscriptionArn": "arn:aws:sns:region:9999999991:ExampleTopic:ExampleSubscriptionId",
			"Sns": {
				"Type": "Notification",
				"TopicArn": "arn:aws:sns:region:9999999991:ExampleTopic",
				"SignatureVersion": "1",
				"Timestamp": `1970-0${rand(1)}-2${rand(1)}T0${rand(1)}:0${rand(1)}:0${rand(1)}.${rand(3)}Z`,
				"Signature": "http://example.com/signature",
				"SigningCertUrl": "http://example.com/signingcerturl",
				"UnsubscribeUrl": "http://example.com/unsubscribeurl",
				"Subject": "TestInvoke",
				"MessageId": `95df01b4-ee${rand(2)}-5cb9-9903-4c221d41${rand(4)}`,
				"Message": JSON.stringify(message),
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
			},
		}]
	};

	instance.handleMessage = (record) => {
		expect(record).toEqual(expect.objectContaining({ "foo": "bar" }));
		expect(instance.getSubject()).toEqual(event.Records[0].Sns.Subject);
		expect(instance.getTimestamp()).toEqual(event.Records[0].Sns.Timestamp);
		expect(instance.getRegion()).toEqual("region");
		expect(instance.getAccountId()).toEqual("9999999991");
	};

	expect.assertions(5);
	await instance.parse(event);
});
