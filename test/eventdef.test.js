/* eslint-disable */

const EventDef = require('../src/eventdef');

test(`EventDef parses raw event`, async () => {
	const testArn = "arn:aws:glue:eu-west-1:123456789012:table/d1/t1:suffix";
	const event = {
		test1: "test89",
		source: "foobar",
		test8: 7,
		region: "us-west-2",
		resources: [ testArn ]
	};
	const result = new EventDef(event);
	expect(result.rawEvent).toEqual(event);
	expect(result.record).toEqual(event);
	expect(result.message).toEqual(event);
	expect(result.getRegion()).toEqual("us-west-2");
	expect(result.getArn().region).toEqual("eu-west-1");
	expect(result.getArn().product).toEqual("glue");
	expect(result.getArn().account).toEqual("123456789012");
	expect(result.getArn().resource).toEqual("table/d1/t1");
	expect(result.getArn().suffix).toEqual("suffix");
	expect(result.getSource()).toEqual("foobar");
	expect(result.getTime()).toEqual(undefined);
});


test(`EventDef parses SNS event`, async () => {
	const testArn = "arn:aws:glue:eu-west-1:123456789015:table/d1/t1";
	const ParserMock = require('./parsers/_parser_mock');
	const event = {
		source: "foobar",
		test1: "test71",
		test8: 8,
		resources: [ testArn ]
	};
	const snsEvent = ParserMock.snsMessageToEvent(event, "test event");

	const result = new EventDef(snsEvent);
	expect(result.rawEvent).toEqual(snsEvent);
	expect(result.record).toEqual(snsEvent.Records[0]);
	expect(result.message).toEqual(event);
	expect(result.getArn().region).toEqual("eu-west-1");
	expect(result.getArn().product).toEqual("glue");
	expect(result.getRegion()).toEqual("eu-west-1");
	expect(result.getSource()).toEqual("foobar");
	expect(result.getTime()).toBeTruthy();
});


test(`EventDef falls back to SNS details`, async () => {
	const ParserMock = require('./parsers/_parser_mock');
	const event = {
		source: "aws.foobar",
		test1: "test06",
		test4: 3,
	};
	const snsEvent = ParserMock.snsMessageToEvent(event, "test event");

	const result = new EventDef(snsEvent);
	expect(result.rawEvent).toEqual(snsEvent);
	expect(result.record).toEqual(snsEvent.Records[0]);
	expect(result.message).toEqual(event);
	expect(result.getArn().region).toEqual("region");// default in .snsMessageToEvent()
	expect(result.getArn().product).toEqual("sns");
	expect(result.getRegion()).toEqual("region");
	expect(result.getSource()).toEqual("foobar");
});

test(`EventDef creates console links`, () => {
	const evt = new EventDef({
		Records: [ { region: "us-west-7" }]
	});
	expect(evt.consoleUrl("/foo")).toEqual("https://console.aws.amazon.com/foo?region=us-west-7");
	expect(evt.consoleUrl("/ec2/home#goal:7")).toEqual("https://console.aws.amazon.com/ec2/home?region=us-west-7#goal:7");
	expect(evt.consoleUrl("/ec2/home?region=us-west-1#goal:7")).toEqual("https://console.aws.amazon.com/ec2/home?region=us-west-1#goal:7");
	expect(evt.getLink("Test text", "https://example.com").toString()).toEqual("<https://example.com|Test text>");
});
