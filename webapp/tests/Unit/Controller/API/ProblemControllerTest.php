<?php declare(strict_types=1);

namespace App\Tests\Unit\Controller\API;

use App\DataFixtures\Test\DummyProblemFixture;

class ProblemControllerTest extends BaseTest
{
    /* This tests with the anonymous user;
       for tests with the admin user see ProblemControllerAdminTest.
     */

    protected ?string $apiEndpoint = 'problems';

    protected array $expectedObjects = [
        3 => [
            "ordinal"    => 0,
            "id"         => "3",
            "short_name" => "boolfind",
            "label"      => "boolfind",
            "time_limit" => 5,
            "externalid" => "boolfind",
            "name"       => "Boolean switch search",
            "rgb"        => "#008000",
            "color"      => "green",
            "statement"  => [
                [
                    'href'     => 'contests/2/problems/3/statement',
                    'mime'     => 'application/pdf',
                    'filename' => 'boolfind.pdf',
                ],
            ],
        ],
        2 => [
            "ordinal"    => 1,
            "id"         => "2",
            "short_name" => "fltcmp",
            "label"      => "fltcmp",
            "time_limit" => 5,
            "externalid" => "fltcmp",
            "name"       => "Float special compare test",
            "rgb"        => "#CD5C5C",
            "color"      => "indianred",
            "statement"  => [
                [
                    'href'     => 'contests/2/problems/2/statement',
                    'mime'     => 'application/pdf',
                    'filename' => 'fltcmp.pdf',
                ],
            ],
        ],
        1 => [
            "ordinal"    => 2,
            "id"         => "1",
            "short_name" => "hello",
            "label"      => "hello",
            "time_limit" => 5,
            "externalid" => "hello",
            "name"       => "Hello World",
            "rgb"        => "#87CEEB",
            "color"      => "skyblue",
            "statement"  => [
                [
                    'href'     => 'contests/2/problems/1/statement',
                    'mime'     => 'application/pdf',
                    'filename' => 'hello.pdf',
                ],
            ],
        ],
    ];

    protected array $expectedAbsent = ['4242', 'nonexistent'];

    public function testDeleteNotAllowed(): void
    {
        if ($this->apiUser === 'admin') {
            $this->markTestSkipped('Only run for non-admins.');
        }

        // Check that we can not delete the problem
        $url = $this->helperGetEndpointURL($this->apiEndpoint) . '/2';
        $this->verifyApiJsonResponse('DELETE', $url, 401, $this->apiUser);

        // Check that we still have three problems left
        $indexUrl = $this->helperGetEndpointURL($this->apiEndpoint);
        $problems = $this->verifyApiJsonResponse('GET', $indexUrl, 200, $this->apiUser);
        self::assertCount(3, $problems);
    }

    public function testAddNotAllowed(): void
    {
        if ($this->apiUser === 'admin') {
            $this->markTestSkipped('Only run for non-admins.');
        }

        $this->loadFixture(DummyProblemFixture::class);

        // Check that we can not add a problem
        $problemId = $this->resolveReference(DummyProblemFixture::class . ':0');
        $url       = $this->helperGetEndpointURL($this->apiEndpoint) . '/' . $problemId;
        $this->verifyApiJsonResponse('DELETE', $url, 401, $this->apiUser, ['label' => 'dummy']);

        // Check that we still have three problems left
        $indexUrl = $this->helperGetEndpointURL($this->apiEndpoint);
        $problems = $this->verifyApiJsonResponse('GET', $indexUrl, 200, $this->apiUser);
        self::assertCount(3, $problems);
    }

    /**
     * Test that the statement endpoint returns a PDF for objects that exist.
     *
     * @dataProvider provideSingle
     */
    public function testStatement($id): void
    {
        $id = $this->resolveReference($id);
        if (($apiEndpoint = $this->apiEndpoint) === null) {
            static::markTestSkipped('No endpoint defined.');
        }
        $url = $this->helperGetEndpointURL($apiEndpoint, (string)$id) . '/statement';

        // Use output buffering since this is a streamed response
        ob_start();
        $this->client->request('GET', '/api' . $url);
        $response = $this->client->getResponse();
        ob_end_clean();
        self::assertEquals(200, $response->getStatusCode(), 'Statement found');

        // We can't easily check if the contents are actually a PDF, so assume it is
    }

    /**
     * Test that the statement endpoint does not return anything for objects that don't exist.
     *
     * @dataProvider provideSingleNotFound
     */
    public function testStatementNotFound(string $id): void
    {
        $id = $this->resolveReference($id);
        if (($apiEndpoint = $this->apiEndpoint) === null) {
            static::markTestSkipped('No endpoint defined.');
        }
        $url = $this->helperGetEndpointURL($apiEndpoint, $id) . '/statement';
        $this->verifyApiJsonResponse('GET', $url, 404, $this->apiUser);
    }
}
