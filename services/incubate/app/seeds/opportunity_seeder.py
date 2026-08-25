"""Incubate Service — Comprehensive African Funding Opportunity Seeder.

Populates PostgreSQL with major African non-dilutive opportunities across:
- Pan-African Catalytic Grants
- National Startup Act Incentives (Nigeria, Kenya, Tunisia, Senegal)
- Climate & Agritech Challenge Funds
- Deep-Tech & AI Accelerators
- Gender-Lens & Youth Entrepreneurship Funds
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import date
from decimal import Decimal

import structlog
from sqlalchemy import select

from services.incubate.app.config import settings
from services.platform.app.models.platform import Opportunity
from services.shared.database import create_engine as create_db_engine
from services.shared.database import create_session_factory

logger = structlog.get_logger()

SEEDED_OPPORTUNITIES = [
    {
        "title": "Tony Elumelu Foundation (TEF) Entrepreneurship Programme",
        "funder": "The Tony Elumelu Foundation",
        "funder_type": "Philanthropic Foundation",
        "funding_type": "Grant",
        "amount_min": Decimal("5000"),
        "amount_max": Decimal("5000"),
        "currency": "USD",
        "eligible_regions": [
            "Pan-African",
            "Nigeria",
            "Kenya",
            "Ghana",
            "South Africa",
            "Rwanda",
            "Uganda",
            "Egypt",
        ],
        "eligible_sectors": ["All", "Agritech", "Fintech", "Healthtech", "Edtech", "Clean Energy"],
        "eligible_stages": ["Idea", "MVP", "Seed"],
        "deadline": date(2026, 3, 31),
        "is_rolling": False,
        "description": "Non-refundable seed capital of $5,000, 12 weeks of business management training, and global mentorship for young African entrepreneurs.",
        "application_url": "https://www.tefconnect.com",
        "source_url": "https://tonyelumelufoundation.org",
    },
    {
        "title": "Africa Startup Initiative Programme (ASIP) Accelerator",
        "funder": "African Development Bank & Startupbootcamp AfriTech",
        "funder_type": "Multilateral DFI",
        "funding_type": "Grant & Equity-Free",
        "amount_min": Decimal("18000"),
        "amount_max": Decimal("100000"),
        "currency": "USD",
        "eligible_regions": [
            "Pan-African",
            "Senegal",
            "Ivory Coast",
            "Nigeria",
            "Kenya",
            "Morocco",
            "South Africa",
        ],
        "eligible_sectors": ["Fintech", "Agritech", "Climate Tech", "Supply Chain", "Healthtech"],
        "eligible_stages": ["MVP", "Seed", "Early"],
        "deadline": date(2026, 11, 30),
        "is_rolling": False,
        "description": "Catalytic grant funding, pilot corporate partner integration, and $750k+ in partner credits for top African early-stage tech startups.",
        "application_url": "https://sbcafritech.com",
        "source_url": "https://www.afdb.org",
    },
    {
        "title": "Google for Startups Accelerator: Africa",
        "funder": "Google for Startups",
        "funder_type": "Corporate",
        "funding_type": "Equity-Free Support & Cloud Credits",
        "amount_min": Decimal("50000"),
        "amount_max": Decimal("350000"),
        "currency": "USD",
        "eligible_regions": [
            "Pan-African",
            "Nigeria",
            "Kenya",
            "South Africa",
            "Ghana",
            "Rwanda",
            "Ethiopia",
            "Egypt",
        ],
        "eligible_sectors": [
            "AI & Machine Learning",
            "Fintech",
            "Logistics",
            "Healthtech",
            "Sustainability",
        ],
        "eligible_stages": ["Seed", "Early", "Growth"],
        "deadline": date(2026, 8, 15),
        "is_rolling": False,
        "description": "Equity-free mentorship from Google AI engineers, $350k Google Cloud credits, technical project sprints, and global investor access.",
        "application_url": "https://startup.google.com/programs/accelerator/africa",
        "source_url": "https://startup.google.com",
    },
    {
        "title": "Nigeria Startup Act Labeling & Tax Incentive",
        "funder": "National Information Technology Development Agency (NITDA)",
        "funder_type": "Government Authority",
        "funding_type": "Tax Credit & Exemption",
        "amount_min": Decimal("10000"),
        "amount_max": Decimal("500000"),
        "currency": "USD",
        "eligible_regions": ["Nigeria"],
        "eligible_sectors": [
            "Tech-Enabled",
            "Software",
            "Hardware",
            "Fintech",
            "Agritech",
            "Healthtech",
        ],
        "eligible_stages": ["Idea", "MVP", "Seed", "Early", "Growth"],
        "deadline": None,
        "is_rolling": True,
        "description": "Four-year pioneer status tax holiday, R&D tax credits, fast-tracked IP registration, and access to the Nigeria Startup Investment Seed Fund.",
        "application_url": "https://startup.gov.ng",
        "source_url": "https://nitda.gov.ng",
    },
    {
        "title": "Mastercard Foundation Young Africa Works Challenge Fund",
        "funder": "Mastercard Foundation",
        "funder_type": "Philanthropic Foundation",
        "funding_type": "Grant",
        "amount_min": Decimal("100000"),
        "amount_max": Decimal("500000"),
        "currency": "USD",
        "eligible_regions": [
            "Ghana",
            "Kenya",
            "Nigeria",
            "Rwanda",
            "Senegal",
            "Uganda",
            "Ethiopia",
        ],
        "eligible_sectors": ["Agritech", "Digital Economy", "Youth Employment", "Manufacturing"],
        "eligible_stages": ["Seed", "Early", "Growth"],
        "deadline": date(2026, 10, 31),
        "is_rolling": False,
        "description": "Large-scale grant funding for scalable technology solutions that directly create and sustain dignifying jobs for African youth and women.",
        "application_url": "https://mastercardfdn.org/all/young-africa-works",
        "source_url": "https://mastercardfdn.org",
    },
    {
        "title": "develoPPP Ventures Africa",
        "funder": "German Federal Ministry for Economic Cooperation and Development (BMZ)",
        "funder_type": "Bilateral DFI",
        "funding_type": "Matching Grant",
        "amount_min": Decimal("100000"),
        "amount_max": Decimal("100000"),
        "currency": "EUR",
        "eligible_regions": [
            "Ghana",
            "Kenya",
            "Nigeria",
            "Rwanda",
            "South Africa",
            "Tanzania",
            "Ivory Coast",
        ],
        "eligible_sectors": ["Climate Tech", "Agritech", "Circularity", "Healthtech", "Edtech"],
        "eligible_stages": ["Seed", "Early"],
        "deadline": date(2026, 6, 30),
        "is_rolling": False,
        "description": "Matching grant of up to €100,000 for early-stage impact startups that combine commercial viability with positive development impact.",
        "application_url": "https://www.developpp.de/en/ventures",
        "source_url": "https://www.developpp.de",
    },
    {
        "title": "GSMA Innovation Fund for Climate Resilience and Adaptation",
        "funder": "GSMA & UK FCDO",
        "funder_type": "Industry Body & Bilateral DFI",
        "funding_type": "Grant",
        "amount_min": Decimal("125000"),
        "amount_max": Decimal("300000"),
        "currency": "GBP",
        "eligible_regions": [
            "Pan-African",
            "Kenya",
            "Nigeria",
            "Ethiopia",
            "Tanzania",
            "Madagascar",
        ],
        "eligible_sectors": ["Mobile Tech", "Climate Resilience", "Agritech", "Disaster Response"],
        "eligible_stages": ["MVP", "Seed", "Early"],
        "deadline": date(2026, 9, 15),
        "is_rolling": False,
        "description": "Equity-free grants of £100k to £250k for digital innovators leveraging mobile network operator assets to build climate resilience.",
        "application_url": "https://www.gsma.com/innovationfund",
        "source_url": "https://www.gsma.com",
    },
    {
        "title": "Kenya Startup Bill Innovation Fund",
        "funder": "Kenya National Innovation Agency (KeNIA)",
        "funder_type": "Government Authority",
        "funding_type": "Grant & Subsidized Incubation",
        "amount_min": Decimal("15000"),
        "amount_max": Decimal("75000"),
        "currency": "USD",
        "eligible_regions": ["Kenya"],
        "eligible_sectors": [
            "Fintech",
            "Agritech",
            "Clean Energy",
            "Creative Economy",
            "Healthtech",
        ],
        "eligible_stages": ["Idea", "MVP", "Seed"],
        "deadline": None,
        "is_rolling": True,
        "description": "Government innovation grants, credit guarantee schemes, and subsidized incubation for registered Kenyan tech startups.",
        "application_url": "https://www.innovationagency.go.ke",
        "source_url": "https://www.innovationagency.go.ke",
    },
]


async def seed_opportunities() -> int:
    """Seed African funding opportunities into PostgreSQL."""
    engine = create_db_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    seeded_count = 0

    async with session_factory() as session:
        for opp_data in SEEDED_OPPORTUNITIES:
            # Check if already exists
            existing = await session.execute(
                select(Opportunity).where(Opportunity.title == opp_data["title"])
            )
            if existing.scalar_one_or_none() is not None:
                continue

            opp = Opportunity(
                id=uuid.uuid4(),
                title=opp_data["title"],
                funder=opp_data["funder"],
                funder_type=opp_data.get("funder_type"),
                funding_type=opp_data["funding_type"],
                amount_min=opp_data.get("amount_min"),
                amount_max=opp_data.get("amount_max"),
                currency=opp_data.get("currency", "USD"),
                eligible_regions=opp_data.get("eligible_regions", []),
                eligible_sectors=opp_data.get("eligible_sectors", []),
                eligible_stages=opp_data.get("eligible_stages", []),
                deadline=opp_data.get("deadline"),
                is_rolling=opp_data.get("is_rolling", False),
                description=opp_data["description"],
                application_url=opp_data.get("application_url"),
                source_url=opp_data["source_url"],
                status="active",
            )
            session.add(opp)
            seeded_count += 1

        await session.commit()

    await engine.dispose()
    logger.info("opportunities_seeded_successfully", count=seeded_count)
    return seeded_count


if __name__ == "__main__":
    asyncio.run(seed_opportunities())
