<?php declare(strict_types=1);

namespace App\Controller\Team;

use App\Controller\BaseController;
use App\DataTransferObject\SubmissionRestriction;
use App\Entity\Team;
use App\Service\ConfigurationService;
use App\Service\DOMJudgeService;
use App\Service\EventLogService;
use App\Service\ScoreboardService;
use App\Service\SubmissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_TEAM')]
#[IsGranted(
    new Expression('user.getTeam() !== null'),
    message: 'You do not have a team associated with your account.'
)]
#[Route(path: '/team')]
class ScoreboardController extends BaseController
{
    public function __construct(
        DOMJudgeService $dj,
        protected readonly ConfigurationService $config,
        protected readonly ScoreboardService $scoreboardService,
        EntityManagerInterface $em,
        protected readonly EventLogService $eventLogService,
        KernelInterface $kernel,
    ) {
        parent::__construct($em, $eventLogService, $dj, $kernel);
    }

    #[Route(path: '/scoreboard', name: 'team_scoreboard')]
    public function scoreboardAction(Request $request): Response
    {
        if (!$this->config->get('enable_ranking')) {
            throw new BadRequestHttpException('Scoreboard is not available.');
        }

        $user       = $this->dj->getUser();
        $response   = new Response();
        $contest    = $this->dj->getCurrentContest($user->getTeam()->getTeamid());
        $refreshUrl = $this->generateUrl('team_scoreboard');
        $data       = $this->scoreboardService->getScoreboardTwigData(
            $request, $response, $refreshUrl, false, false, false, $contest
        );
        $data['myTeamId'] = $user->getTeam()->getTeamid();

        if ($request->isXmlHttpRequest()) {
            $data['current_contest'] = $contest;
            return $this->render('partials/scoreboard.html.twig', $data, $response);
        }
        return $this->render('team/scoreboard.html.twig', $data, $response);
    }

    #[Route(path: '/team/{teamId<\d+>}', name: 'team_team')]
    public function teamAction(Request $request, int $teamId): Response
    {
        if (!$this->config->get('enable_ranking')) {
            throw new BadRequestHttpException('Scoreboard is not available.');
        }

        /** @var Team|null $team */
        $team             = $this->em->getRepository(Team::class)->find($teamId);
        if ($team && $team->getCategory() && !$team->getCategory()->getVisible() && $teamId !== $this->dj->getUser()->getTeamId()) {
            $team = null;
        }
        $showFlags        = (bool)$this->config->get('show_flags');
        $showAffiliations = (bool)$this->config->get('show_affiliations');
        $data             = [
            'team' => $team,
            'showFlags' => $showFlags,
            'showAffiliations' => $showAffiliations,
        ];

        if ($request->isXmlHttpRequest()) {
            return $this->render('team/team_modal.html.twig', $data);
        }

        return $this->render('team/team.html.twig', $data);
    }

    #[Route(path: '/team/{teamId<\d+>}/submissions', name: 'team_team_submissions')]
    public function teamSubmissionAction(
        Request $request,
        int $teamId,
        SubmissionService $submissionService,
        #[MapQueryParameter]
        ?int $cid = null
    ): Response
    {
        if (!$this->config->get('enable_ranking')) {
            throw new BadRequestHttpException('Scoreboard is not available.');
        }

        $team = $this->em->getRepository(Team::class)->find($teamId);
        if ($team && $team->getCategory() && !$team->getCategory()->getVisible() && $teamId !== $this->dj->getUser()->getTeamId()) {
            $team = null;
        }

        $data = [
            'team' => $team,
            'showPending' => $this->config->get('show_pending'),
            'compilePenalty' => $this->config->get('compile_penalty'),
            'verificationRequired' => $this->config->get('verification_required')
        ];
        $restrictions = new SubmissionRestriction();
        $restrictionText = '';

        if ($request->query->has('restrict')) {
            $restrictionsFromQuery = $request->query->all('restrict');
            $restrictionTexts = [];
            foreach ($restrictionsFromQuery as $key => $value) {
                $restrictionKeyText = match ($key) {
                    'problemId' => 'problem',
                    default => throw new BadRequestHttpException(sprintf('Restriction on %s not allowed.', $key)),
                };
                $restrictions->$key = is_numeric($value) ? (int)$value : $value;
                $restrictionTexts[] = sprintf('%s %s', $restrictionKeyText, $value);
            }
            $restrictionText = implode(', ', $restrictionTexts);
        }
        $restrictions->teamId = $teamId;
        [$submissions, $submissionCount] =
            $submissionService->getSubmissionList($this->dj->getCurrentContests(honorCookie: true), $restrictions);

        $data['restrictionText']    = $restrictionText;
        $data['submissions']        = $submissions;

        if ($request->isXmlHttpRequest()) {
            return $this->render('team/team_submissions_modal.html.twig', $data);
        }

        return $this->render('team/team_submissions.html.twig', $data);
    }
}
