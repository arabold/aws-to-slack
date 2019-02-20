/* eslint-disable */

const exampleBatchSNSEvent = {
	"source": "aws.batch",
	//TODO add more test data
};

require("./_parser_mock")
	.named("batch-events")
	.matchesSnsMessage(exampleBatchSNSEvent);
