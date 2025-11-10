# Contributing to Dual Avatar Platform

Thank you for your interest in contributing to the Dual Avatar Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Docker version, etc.)
- **Logs and screenshots** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** and motivation
- **Proposed solution** or API changes
- **Alternative solutions** you've considered

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `develop`:
   ```bash
   git checkout -b feature/my-new-feature develop
   ```
3. **Make your changes** following our coding standards
4. **Write tests** for your changes
5. **Update documentation** as needed
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open a Pull Request** to `develop` branch

## Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for Manual Platform)
- Python 3.11+ (for Autonomous Platform)
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dual-avatar-platform.git
cd dual-avatar-platform

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/dual-avatar-platform.git

# Run setup
./infrastructure/scripts/setup.sh

# Start development environment
docker-compose up -d
```

## Coding Standards

### General

- Write clear, self-documenting code
- Follow existing code style and patterns
- Keep functions small and focused
- Add comments for complex logic

### TypeScript/JavaScript (Manual Platform)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer async/await over promises
- Use meaningful variable names

```typescript
// Good
async function fetchUserProjects(userId: string): Promise<Project[]> {
  const projects = await query('SELECT * FROM projects WHERE user_id = $1', [userId]);
  return projects.rows;
}

// Bad
async function getStuff(id: string) {
  return (await query('SELECT * FROM projects WHERE user_id = $1', [id])).rows;
}
```

### Python (Autonomous Platform)

- Follow PEP 8 style guide
- Use type hints
- Use Black for formatting
- Use meaningful variable names
- Document functions with docstrings

```python
# Good
async def create_batch_job(
    batch_id: UUID,
    config: dict,
    db: AsyncSession
) -> BatchJob:
    """
    Create a new batch job.

    Args:
        batch_id: The batch this job belongs to
        config: Job configuration
        db: Database session

    Returns:
        Created BatchJob instance
    """
    job = BatchJob(batch_id=batch_id, config=config)
    db.add(job)
    await db.commit()
    return job
```

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(manual-backend): add video rendering progress tracking

Implemented WebSocket-based progress updates for video rendering.
Users can now see real-time progress of their video renders.

Closes #123
```

## Testing

### Manual Platform Backend

```bash
cd platforms/manual/backend
npm test
npm run test:watch  # Watch mode
npm test -- --coverage  # With coverage
```

### Manual Platform Frontend

```bash
cd platforms/manual/frontend
npm test
npm run test:watch
```

### Autonomous Platform Orchestrator

```bash
cd platforms/autonomous/orchestrator
pytest
pytest --cov=src  # With coverage
pytest -v  # Verbose
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## Documentation

### Code Documentation

- Add JSDoc/docstrings for all public functions
- Document complex algorithms
- Update README when adding features
- Keep API documentation in sync

### API Documentation

API changes should be documented in:
- OpenAPI/Swagger specs
- `docs/api/` directory
- README.md if user-facing

## Project Structure

```
dual-avatar-platform/
├── platforms/
│   ├── manual/           # Manual platform (high-quality)
│   │   ├── backend/      # Node.js/Express API
│   │   └── frontend/     # Next.js/React UI
│   └── autonomous/       # Autonomous platform (batch)
│       ├── orchestrator/ # FastAPI orchestrator
│       ├── comfyui/      # Image generation
│       ├── avatar/       # Avatar service
│       └── voice/        # Voice synthesis
├── shared/               # Shared resources
│   ├── storage/          # MinIO storage
│   ├── workflows/        # n8n workflows
│   └── monitoring/       # Prometheus/Grafana
├── infrastructure/       # Deployment configs
│   ├── docker/           # Dockerfiles
│   ├── kubernetes/       # K8s manifests
│   └── scripts/          # Setup/deploy scripts
└── docs/                 # Documentation
```

## Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `fix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

## Release Process

1. Create release branch from `develop`
2. Update version numbers
3. Update CHANGELOG.md
4. Test thoroughly
5. Merge to `main` and tag
6. Deploy to production
7. Merge back to `develop`

## Review Process

All submissions require review. We use GitHub pull requests:

1. **Automated checks** must pass (CI, tests, linting)
2. **Code review** by at least one maintainer
3. **Testing** in staging environment
4. **Documentation** updated as needed
5. **Approval** and merge

## Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Discord**: Real-time chat and support
- **Weekly Office Hours**: Video calls with maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Acknowledged in documentation

## Questions?

Feel free to ask questions by:
- Opening a GitHub Discussion
- Joining our Discord server
- Reaching out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Dual Avatar Platform! 🎉
