"""Dependency-free PDF certificate renderer (pure Python, Helvetica core font).

WeasyPrint is declared as a dependency but cannot load its native libs on this
Windows host, so we ship a minimal, deterministic single-page PDF writer that
needs no external libraries.
"""

from __future__ import annotations

from typing import Any


class _PDF:
    """Minimal single-page text PDF writer using the built-in Helvetica font."""

    def __init__(self, width: float = 595.28, height: float = 841.89) -> None:
        # A4 portrait in points (72pt/inch).
        self.width = width
        self.height = height
        self._texts: list[str] = []

    def text(self, x: float, y: float, size: float, text: str) -> None:
        """Add a text run at (x, y) measured from the bottom-left, size in pt."""
        escaped = text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        self._texts.append(f"BT /F1 {size} Tf {x:.2f} {y:.2f} Td ({escaped}) Tj ET")

    def render(self) -> bytes:
        """Serialize to a valid PDF byte stream."""
        content = " ".join(self._texts).encode("latin-1", "replace")

        objects: list[bytes] = [
            b"<< /Type /Catalog /Pages 2 0 R >>",  # 1: catalog
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",  # 2: pages
            (  # 3: page
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
                + f"{self.width:.2f} {self.height:.2f}".encode()
                + b"] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
            ),
            (  # 4: content stream
                b"<< /Length "
                + str(len(content)).encode()
                + b" >>\nstream\n"
                + content
                + b"\nendstream"
            ),
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",  # 5: font
        ]

        out = bytearray(b"%PDF-1.4\n")
        offsets: list[int] = []
        for i, obj in enumerate(objects, start=1):
            offsets.append(len(out))
            out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"

        xref_pos = len(out)
        out += f"xref\n0 {len(objects) + 1}\n".encode()
        out += b"0000000000 65535 f \n"
        for off in offsets:
            out += f"{off:010d} 00000 n \n".encode()
        out += (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
            + f"startxref\n{xref_pos}\n%%EOF\n".encode()
        )
        return bytes(out)


def render_certificate_pdf(designation: dict[str, Any]) -> bytes:
    """Render a designation result into a single-page PDF certificate."""
    pdf = _PDF()
    margin = 72.0

    # Header
    pdf.text(margin, pdf.height - 80, 12, designation.get("issuer", ""))
    pdf.text(margin, pdf.height - 110, 22, "STARTUP DESIGNATION CERTIFICATE")

    # Grade (large)
    pdf.text(margin, pdf.height - 180, 34, designation.get("grade", ""))

    # Facts
    name = designation.get("project_name") or designation.get("submission_id", "")
    pdf.text(margin, pdf.height - 225, 14, f"Project: {name}")
    pdf.text(margin, pdf.height - 252, 12, f"Score: {designation.get('score')} / 100")
    pdf.text(margin, pdf.height - 276, 12, f"Certificate ID: {designation.get('certificate_id')}")
    pdf.text(margin, pdf.height - 300, 12, f"Issued: {designation.get('issued_at')}")
    pdf.text(margin, pdf.height - 324, 12, f"Validity: {designation.get('validity_days')} days")

    # Rubric breakdown
    y = pdf.height - 370
    pdf.text(margin, y, 12, "Rubric Breakdown")
    y -= 22
    for row in designation.get("rubric", []):
        label = row.get("label", row.get("dimension", ""))
        weight = row.get("weight", 0)
        score = row.get("score", 0)
        pdf.text(margin, y, 10, f"{label} ({weight}%) ......... {score}/10")
        y -= 16

    # Footer
    pdf.text(
        margin,
        60,
        9,
        "Deterministic, auditable designation issued by the internal Certification Engine.",
    )

    return pdf.render()
