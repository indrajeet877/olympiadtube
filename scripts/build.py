#!/usr/bin/env python3
"""Build OlympiadTube's 40-module Olympiad & Deep STEM YouTube index (data/videos.json).

Pure Python 3 standard library. Run from anywhere:

    python3 scripts/build.py --self-test
    python3 scripts/build.py
    python3 scripts/build.py --fresh

Queries YouTube's public web search endpoint across all 40 canonical Olympiad modules
spanning 5 streams:
  1. Maths Olympiad (IOQM · RMO · INMO · IMO — 12 modules)
  2. Physics Olympiad (NSEP · INPhO · IPhO — 10 modules)
  3. Chemistry Olympiad (NSEC · INChO · IChO — 8 modules)
  4. Jr Science & Astronomy (NSEJS · IJSO · NSEA · IOAA — 5 modules)
  5. Informatics Olympiad (ZCO · ZIO · INOI · IOI — 5 modules)

Enforces a strict Verified Olympiad / Deep STEM / Competitive Programming channel
allowlist, >= 8 minute (480s) duration floor, cross-stream guards, and 100% pure
YouTube audience trend ranking (trend_score, views_per_month, view_count) with ZERO
artificial institute priority.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data" / "cache"
OUT_PATH = ROOT / "data" / "videos.json"

INNERTUBE_SEARCH = "https://www.youtube.com/youtubei/v1/search"
SP_PLAYLIST_ONLY = "EgIQAw=="  # YouTube native Type: Playlist protobuf filter
SP_LONG_VIDEOS = "EgIYAg=="    # YouTube native Duration: >20 minutes protobuf filter

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def _ssl_context() -> ssl.SSLContext:
    for cafile in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
        if os.path.exists(cafile):
            return ssl.create_default_context(cafile=cafile)
    return ssl.create_default_context()


SSL_CTX = _ssl_context()
_lock = threading.Lock()
STATS = {"requests": 0, "cached": 0}

MIN_VIDEO_SECONDS = 480  # >= 8 minutes for focused Olympiad problem walkthroughs & lectures

# ---------------------------------------------------------------------------
# Complete 40-Module Canonical Olympiad Syllabus Taxonomy across 5 Streams
# Tuple:
#   (ch_no, subject, unit, class_level, weightage, syllabus_scope, chapter_name,
#    match_regex, pl_query_1, pl_query_2, long_query, focus_query_1, focus_query_2)
# ---------------------------------------------------------------------------
SYLLABUS: list[tuple[int, str, str, str, str, str, str, str, str, str, str, str, str]] = [
    # ============ 1. MATHS OLYMPIAD (IOQM · RMO · INMO · IMO — 12 Modules) ============
    (
        1,
        "Maths Olympiad",
        "Number Theory",
        "Class 8–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Number Theory: Divisibility, Primes & Modular Arithmetic",
        r"\b(number\s+theory|divisibility|primes?\b|prime\s+numbers?|modular\s+arithmetic|modulo|congruenc\w*|gcd|lcm|euclid\w*|bezout|chinese\s+remainder|\bcrt\b|base\s+system\w*)",
        "Number Theory IOQM RMO Olympiad",
        "Modular Arithmetic Divisibility Primes Olympiad",
        "Number Theory Divisibility Modular Arithmetic IOQM RMO",
        "Modular Arithmetic Primes Number Theory Vedantu Olympiad School Michael Penn",
        "Number Theory IOQM Olympiad Wallah Prashant Jain Cheenta",
    ),
    (
        2,
        "Maths Olympiad",
        "Number Theory",
        "Class 9–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Diophantine Equations, Fermat, Euler & Number Theory Problems",
        r"\b(diophantine|fermat\w*|euler'?s?\s+(?:theorem|totient|phi)|wilson'?s?\s+theorem|lifting\s+the\s+exponent|\blte\b|pell'?s?|legendre\w*|quadratic\s+residue\w*|integer\s+solutions?|number\s+theory\s+problems?|(?:imo|inmo|rmo|putnam)\s+number\s+theory)",
        "Diophantine Equations Olympiad Number Theory",
        "Fermat Euler Theorem IOQM RMO Olympiad",
        "Diophantine Equations Fermat Euler Theorem IOQM RMO INMO",
        "Diophantine Equation Number Theory Problem Michael Penn VOS",
        "Fermat Little Theorem Euler Totient Olympiad Wallah Prashant Jain Cheenta",
    ),
    (
        3,
        "Maths Olympiad",
        "Algebra",
        "Class 8–12",
        "High",
        "IOQM · RMO · INMO · IMO",
        "Polynomials, Roots & Vieta's Relations",
        r"\b(polynomials?|vieta\w*|symmetric\s+(?:polynomials?|functions?)|roots?\s+of\s+polynomial\w*|irreducib\w*|rational\s+root|remainder\s+theorem|factor\s+theorem|newton'?s?\s+sums?|vieta\s+jumping)",
        "Polynomials IOQM RMO Maths Olympiad",
        "Polynomials Vieta Relations Olympiad",
        "Polynomials Roots Vieta Relations IOQM RMO INMO",
        "Polynomials Olympiad IMO RMO Michael Penn Vedantu Olympiad School",
        "Polynomials Vieta Jumping IOQM Olympiad Wallah Prashant Jain Cheenta",
    ),
    (
        4,
        "Maths Olympiad",
        "Algebra",
        "Class 9–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Algebraic Inequalities (AM-GM, Cauchy-Schwarz, Rearrangement)",
        r"\b(inequalit(?:y|ies)|am[\s-]*gm|cauchy[\s-]*schwarz|rearrangement\s+inequalit\w*|jensen\w*|chebyshev\w*|holder\w*|muirhead|schur\w*|titu'?s?\s+lemma|nesbitt)",
        "Inequalities IOQM RMO INMO Olympiad",
        "AM GM Cauchy Schwarz Inequalities Maths Olympiad",
        "Algebraic Inequalities AM GM Cauchy Schwarz IOQM RMO",
        "Cauchy Schwarz Rearrangement Inequality Olympiad VOS Cheenta",
        "AM GM Inequality Titu Lemma IOQM Olympiad Wallah Prashant Jain Michael Penn",
    ),
    (
        5,
        "Maths Olympiad",
        "Algebra",
        "Class 9–12",
        "Very High",
        "RMO · INMO · IMO",
        "Functional Equations & Recurrence Sequences",
        r"\b(functional\s+equations?|cauchy'?s?\s+functional|recurrence\s*(?:relations?|sequences?)?|recursive\s+sequence\w*|characteristic\s+equation|telescoping|fibonacci|generating\s+functions?|sequence\w*\s+(?:and\s+series\s+)?(?:ioqm|prmo|rmo|inmo|imo|olympiad))",
        "Functional Equations Maths Olympiad IOQM INMO",
        "Recurrence Relations Sequences Maths Olympiad",
        "Functional Equations Recurrence Relations IOQM RMO INMO",
        "Functional Equation Olympiad IMO Michael Penn Vedantu Olympiad School",
        "Recurrence Relations Sequences IOQM RMO Olympiad Wallah Cheenta Mathsmerizing",
    ),
    (
        6,
        "Maths Olympiad",
        "Combinatorics",
        "Class 8–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Combinatorics: Counting Principles, Bijections & Pigeonhole",
        r"\b(combinatorics|counting\s+principles?|bijection\w*|bijective|pigeonhole|\bphp\b|stars?\s*(?:and|&)\s*bars?|beggar'?s?\s+method|double\s+counting|permutation\w*\s*(?:and|&)?\s*combination\w*\s+(?:ioqm|prmo|rmo|inmo|olympiad)|(?:ioqm|prmo|rmo|inmo)\s+(?:combinatorics|p\s*&\s*c|pnc))",
        "Combinatorics IOQM RMO Maths Olympiad",
        "Pigeonhole Principle Combinatorics Olympiad",
        "Combinatorics Counting Principles Pigeonhole IOQM RMO",
        "Pigeonhole Principle Bijection Combinatorics Vedantu Olympiad School Cheenta",
        "Combinatorics IOQM RMO Olympiad Wallah Prashant Jain Mathsmerizing",
    ),
    (
        7,
        "Maths Olympiad",
        "Combinatorics",
        "Class 9–12",
        "High",
        "RMO · INMO · IMO",
        "Combinatorics: Inclusion-Exclusion, Invariants & Graph Counting",
        r"\b(inclusion[\s-]*exclusion|\bpie\b|derangement\w*|invariants?\b|monovariant\w*|extremal\s+principle|coloring|chessboard|tiling|ramsey|combinatorial\s+games?|graph\s+theory|planar\s+graphs?|chromatic|eulerian|hamiltonian|handshaking\s+lemma|tur[aá]n)",
        "Graph Theory Michael Penn Maths",
        "Inclusion Exclusion Invariants Combinatorics Olympiad",
        "Inclusion Exclusion Derangements Invariants IOQM RMO INMO",
        "Invariants Monovariants Coloring Olympiad Cheenta Vedantu Olympiad School",
        "Inclusion Exclusion Derangements Graph Theory Michael Penn Olympiad Wallah",
    ),
    (
        8,
        "Maths Olympiad",
        "Geometry",
        "Class 8–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Plane Geometry: Triangles, Angle Chasing, Ceva & Menelaus",
        r"\b(plane\s+geometry|euclidean\s+geometry|triangle\s+geometry|geometry\b.*\b(?:ioqm|prmo|rmo|inmo|imo|olympiad)|(?:ioqm|prmo|rmo|inmo|imo|olympiad)\b.*\bgeometry|angle\s+chasing|ceva\w*|menelaus|stewart'?s?\s+theorem|similarity|congruence|orthocent(?:re|er)|circumcent(?:re|er)|incent(?:re|er)|centroid|nine[\s-]*point|euler\s+line|simson\s+line)",
        "Geometry IOQM RMO INMO Maths Olympiad",
        "Euclidean Geometry Olympiad Cheenta VOS",
        "Geometry Angle Chasing Ceva Menelaus IOQM RMO INMO",
        "Ceva Menelaus Theorem Angle Chasing Vedantu Olympiad School Cheenta",
        "Triangle Geometry IOQM RMO Olympiad Wallah Prashant Jain MindYourDecisions",
    ),
    (
        9,
        "Maths Olympiad",
        "Geometry",
        "Class 9–12",
        "Very High",
        "IOQM · RMO · INMO · IMO",
        "Circle Geometry: Power of a Point, Cyclic Quads & Radical Axis",
        r"\b(circle\s+geometry|circles?\b.*\b(?:ioqm|prmo|rmo|inmo|imo|olympiad|geometry)|(?:ioqm|prmo|rmo|inmo|imo|olympiad)\b.*\bcircles?\b|power\s+of\s+a\s+point|cyclic\s+quad\w*|ptolemy\w*|radical\s+(?:axis|cent(?:re|er))|concyclic|inscribed\s+angle|alternate\s+segment|homothety|inversion|miquel)",
        "Circles IOQM RMO Olympiad Geometry",
        "Circle Geometry Cyclic Quadrilaterals Olympiad",
        "Circle Geometry Power of a Point Cyclic Quadrilaterals IOQM RMO",
        "Power of a Point Radical Axis Ptolemy Vedantu Olympiad School Cheenta",
        "Cyclic Quadrilaterals Circle Geometry IOQM RMO Olympiad Wallah Prashant Jain",
    ),
    (
        10,
        "Maths Olympiad",
        "Geometry",
        "Class 10–12",
        "High",
        "IOQM · RMO · INMO · IMO",
        "Coordinate, Complex & Trigonometric Bash in Geometry",
        r"\b(complex\s+bash\w*|barycentric|trigonometric\s+ceva|trig\s+bash\w*|coordinate\s+bash\w*|complex\s+numbers?\s+(?:in\s+)?geometry|geometry\s+(?:using|with)\s+complex|coordinate\s+geometry\s+(?:ioqm|prmo|rmo|inmo|olympiad)|trigonometry\s+(?:ioqm|prmo|rmo|inmo|olympiad)|solution\s+of\s+triangles?|\bsot\b|sine\s+rule|cosine\s+rule|projective\s+geometry)",
        "Complex Numbers in Geometry Olympiad",
        "Solution of Triangles Coordinate Geometry IOQM RMO",
        "Coordinate Geometry Trigonometry SOT IOQM RMO Olympiad",
        "Complex Bash Barycentric Trigonometric Ceva Geometry Cheenta VOS",
        "Solution of Triangles Complex Geometry Mathsmerizing Olympiad Wallah Prashant Jain",
    ),
    (
        11,
        "Maths Olympiad",
        "Contest Marathons & Proofs",
        "Class 8–12",
        "Very High",
        "IOQM · PRMO",
        "IOQM / PRMO Complete Revision & Past Paper Marathons",
        r"\b(ioqm|prmo|pre[\s-]*rmo)\b.*\b(marathon|one[\s-]*shot|revision|past\s+papers?|pyq\w*|previous\s+year|paper\s+solution\w*|paper\s+discussion|mock|sprint|complete|crash\s+course|201\d|202\d)\b|\b(marathon|one[\s-]*shot|revision|pyq\w*|past\s+papers?|paper\s+solution\w*|mock\s+test)\b.*\b(ioqm|prmo|pre[\s-]*rmo)\b",
        "IOQM Previous Year Questions PYQ Playlist",
        "IOQM Complete Revision Marathon Vedantu Olympiad School",
        "IOQM Complete Revision Marathon PYQ One Shot",
        "IOQM Past Paper Solutions Marathon Vedantu Olympiad School Olympiad Wallah",
        "IOQM PRMO Previous Year Questions Prashant Jain Cheenta ALLEN",
    ),
    (
        12,
        "Maths Olympiad",
        "Contest Marathons & Proofs",
        "Class 9–12",
        "Very High",
        "RMO · INMO · IMO",
        "RMO, INMO & IMO Proof-Writing & Problem Sessions",
        r"\b(rmo|inmo|imo|international\s+math\w*\s+olympiad|indian\s+national\s+math\w*\s+olympiad|regional\s+math\w*\s+olympiad|imo\s+shortlist|usamo|putnam)\b",
        "RMO INMO Maths Olympiad Vedantu Olympiad School Cheenta",
        "International Mathematical Olympiad IMO Problems Michael Penn",
        "RMO INMO Proof Writing Past Paper Solutions Marathon",
        "IMO Problem Solution Michael Penn 3Blue1Brown MindYourDecisions",
        "RMO INMO Problem Session Proof Writing VOS Olympiad Wallah Cheenta",
    ),

    # ============ 2. PHYSICS OLYMPIAD (NSEP · INPhO · IPhO — 10 Modules) ============
    (
        13,
        "Physics Olympiad",
        "Mechanics",
        "Class 11–12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Kinematics, Constraints & Relative Motion (Pathfinder / Irodov)",
        r"\b(kinematics|constraint\s+motion|wedge\s+constraint|pulley\s+constraint|relative\s+motion|projectile|pursuit|chasing|river[\s-]*boat|rectilinear|curvilinear)",
        "Kinematics Pathfinder Irodov Physics",
        "Kinematics NSEP Physics Olympiad",
        "Kinematics Constraints Relative Motion NSEP INPhO Pathfinder",
        "Kinematics Pathfinder Irodov Indian School of Physics Physics Sir JEE",
        "Constraint Motion Relative Motion Physics Galaxy Vinay Uppal VOS",
    ),
    (
        14,
        "Physics Olympiad",
        "Mechanics",
        "Class 11–12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Newtonian Mechanics, Momentum & Collisions (Olympiad)",
        r"\b(newton'?s?\s+laws?|laws?\s+of\s+motion|\bnlm\b|friction|work[\s,]+(?:power|energy)|circular\s+motion|cent(?:re|er)\s+of\s+mass|\bcom\b|momentum|collisions?|impulse|variable\s+mass|rocket\s+propulsion)",
        "Laws of Motion Center of Mass Pathfinder Irodov",
        "Mechanics Momentum Collisions NSEP INPhO",
        "Center of Mass Momentum Collisions Work Energy NSEP INPhO",
        "Collisions Center of Mass Pathfinder Indian School of Physics Physics Sir JEE",
        "Newtonian Mechanics Momentum MIT 8.01 Physics Galaxy Vinay Uppal",
    ),
    (
        15,
        "Physics Olympiad",
        "Mechanics",
        "Class 11–12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Rotational Dynamics & Rigid Body Mechanics (Irodov / INPhO)",
        r"\b(rotation\w*|rigid\s+body|\brbd\b|moment\s+of\s+inertia|torque|angular\s+momentum|rolling\s+motion|toppling|gyroscop\w*|precession|instantaneous\s+axis|\biaor\b)",
        "Rotational Motion Pathfinder Irodov Physics",
        "Rigid Body Dynamics NSEP INPhO Physics Galaxy",
        "Rotational Dynamics Rigid Body Mechanics NSEP INPhO Irodov",
        "Rotational Motion Pathfinder INPhO Indian School of Physics Physics Sir JEE",
        "Rigid Body Rotation Angular Momentum Vinay Uppal MIT OpenCourseWare VOS",
    ),
    (
        16,
        "Physics Olympiad",
        "Mechanics",
        "Class 11–12",
        "High",
        "NSEP · INPhO · IPhO",
        "Gravitation, Central Forces & Keplerian Orbits",
        r"\b(gravitation\w*|central\s+forces?|kepler\w*|orbital\s+(?:motion|velocity|mechanics)|escape\s+velocity|satellites?\b|binary\s+star\w*|effective\s+potential|gravitational\s+(?:field|potential))",
        "Gravitation Pathfinder Irodov Physics Galaxy",
        "Gravitation NSEP INPhO Physics Olympiad",
        "Gravitation Kepler Orbits Central Forces NSEP INPhO",
        "Gravitation Pathfinder Irodov Indian School of Physics Physics Sir JEE",
        "Gravitation Kepler Orbits MIT OpenCourseWare Vinay Uppal Olympiad Wallah",
    ),
    (
        17,
        "Physics Olympiad",
        "Mechanics",
        "Class 11–12",
        "High",
        "NSEP · INPhO · IPhO",
        "Fluid Mechanics, Surface Tension & Elasticity (Olympiad)",
        r"\b(fluid\s*(?:mechanics|dynamics|statics)?|hydrostatics|bernoulli\w*|viscosity|poiseuille|stokes|surface\s+tension|capillar\w*|meniscus|excess\s+pressure|elasticity|young'?s?\s+modulus|stress\s+and\s+strain|mechanical\s+properties\s+of\s+(?:fluids|solids))",
        "Fluid Mechanics Surface Tension Pathfinder Physics Galaxy",
        "Fluid Mechanics Elasticity NSEP INPhO",
        "Fluid Mechanics Surface Tension Viscosity Elasticity NSEP INPhO",
        "Fluid Mechanics Surface Tension Pathfinder Indian School of Physics Physics Sir JEE",
        "Fluids Surface Tension Elasticity Vinay Uppal VOS Olympiad Wallah",
    ),
    (
        18,
        "Physics Olympiad",
        "Thermal & Waves",
        "Class 11–12",
        "High",
        "NSEP · INPhO · IPhO",
        "Thermodynamics, Kinetic Theory & Heat Transfer (NSEP / INPhO)",
        r"\b(thermodynamics|kinetic\s+theory|\bktg\b|heat\s+transfer|calorimetry|thermal\s+(?:expansion|conduction|conductivity|properties)|radiation|stefan|wien|carnot|polytropic|adiabatic)",
        "Thermodynamics KTG Heat Transfer Physics Galaxy",
        "Heat and Thermodynamics NSEP INPhO Pathfinder",
        "Thermodynamics Kinetic Theory Heat Transfer NSEP INPhO",
        "Thermodynamics Heat Transfer Pathfinder Indian School of Physics Physics Sir JEE",
        "KTG Thermodynamics Radiation NSEP VOS Olympiad Wallah Vinay Uppal",
    ),
    (
        19,
        "Physics Olympiad",
        "Thermal & Waves",
        "Class 11–12",
        "High",
        "NSEP · INPhO · IPhO",
        "Oscillations, Mechanical Waves & Doppler Effect",
        r"\b(oscillations?|simple\s+harmonic|\bshm\b|pendulum|normal\s+modes?|coupled\s+oscillators?|mechanical\s+waves?|waves?\s+on\s+(?:a\s+)?string|string\s+waves?|sound\s+waves?|standing\s+waves?|organ\s+pipe|beats|doppler)",
        "Oscillations Waves SHM Physics Galaxy MIT 8.03",
        "SHM Mechanical Waves NSEP INPhO",
        "Simple Harmonic Motion Waves Doppler Effect NSEP INPhO",
        "Oscillations SHM Waves Pathfinder Indian School of Physics Physics Sir JEE",
        "Mechanical Waves Doppler Effect MIT OpenCourseWare VOS Olympiad Wallah",
    ),
    (
        20,
        "Physics Olympiad",
        "Electrodynamics",
        "Class 12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Electrostatics, Gauss's Law, Conductors & Capacitors (Olympiad)",
        r"\b(electrostatics?|gauss'?s?\s+law|coulomb\w*|electric\s+(?:field|potential|charges?|dipole|flux)|conductors?\b|earthing|method\s+of\s+images|capacitors?|capacitance|dielectrics?|electrostatic\s+pressure)",
        "Electrostatics Capacitors Physics Galaxy Pathfinder",
        "Electrostatics Conductors Capacitors NSEP INPhO",
        "Electrostatics Gauss Law Conductors Capacitors NSEP INPhO",
        "Electrostatics Capacitors Pathfinder Indian School of Physics Physics Sir JEE",
        "Gauss Law Conductors Capacitors MIT 8.02 Vinay Uppal Olympiad Wallah",
    ),
    (
        21,
        "Physics Olympiad",
        "Electrodynamics",
        "Class 12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Magnetism, Electromagnetic Induction & AC/RC Circuits",
        r"\b(magnetism|magnetic\s+(?:field|force|effects?)|biot[\s-]*savart|ampere'?s?\s+law|lorentz|moving\s+charges|electromagnetic\s+induction|\bemi\b|faraday\w*|lenz\w*|inductance|motional\s+emf|induced\s+electric|alternating\s+current|\bac\s+circuits?\b|\blcr\b|\brc\s+circuits?\b|\brl\s+circuits?\b|current\s+electricity|kirchhoff)",
        "Magnetism Electromagnetic Induction Physics Galaxy",
        "EMI Magnetism AC Circuits NSEP INPhO",
        "Magnetism Electromagnetic Induction RC AC Circuits NSEP INPhO",
        "Electromagnetic Induction Magnetism Pathfinder Indian School of Physics Physics Sir JEE",
        "Magnetism EMI RC Circuits MIT 8.02 Vinay Uppal VOS Olympiad Wallah",
    ),
    (
        22,
        "Physics Olympiad",
        "Optics & Modern Physics",
        "Class 12",
        "Very High",
        "NSEP · INPhO · IPhO",
        "Geometrical & Wave Optics, Modern Physics & NSEP/INPhO Solutions",
        r"\b(geometrical\s+optics|ray\s+optics|wave\s+optics|refraction|prism|lens|mirror|interference|diffraction|\bydse\b|polarization|modern\s+physics|photoelectric|bohr\w*|de\s+broglie|nuclear\s+physics|radioactivity|x[\s-]*rays?|relativity|\bnsep\b|\binpho\b|\bipho\b)",
        "Optics Modern Physics NSEP INPhO Physics Galaxy",
        "NSEP INPhO Previous Year Paper Solutions",
        "Geometrical Wave Optics Modern Physics NSEP INPhO Solutions",
        "Optics Modern Physics Pathfinder Indian School of Physics Physics Sir JEE",
        "NSEP INPhO Paper Solutions Vedantu Olympiad School Olympiad Wallah ALLEN",
    ),

    # ============ 3. CHEMISTRY OLYMPIAD (NSEC · INChO · IChO — 8 Modules) ============
    (
        23,
        "Chemistry Olympiad",
        "Physical Chemistry",
        "Class 11–12",
        "High",
        "NSEC · INChO · IChO",
        "Mole Concept, Stoichiometry, Redox & Volumetric Titration (NSEC)",
        r"\b(mole\s+concept|stoichiometry|limiting\s+reagent|redox|equivalent\s+concept|volumetric|titration\w*|iodometr\w*|iodimetr\w*|back\s+titration|oxidation\s+(?:number|state)|n[\s-]*factor)",
        "Mole Concept Redox Titration NSEC Chemistry",
        "Redox Equivalent Volumetric Titration ALK Sir DexterChem",
        "Mole Concept Stoichiometry Redox Volumetric Titration NSEC",
        "Redox Volumetric Titration NSEC Vedantu Olympiad School Olympiad Wallah",
        "Stoichiometry Redox Titration IITian Explains The Organic Chemistry Tutor",
    ),
    (
        24,
        "Chemistry Olympiad",
        "Physical Chemistry",
        "Class 11–12",
        "Very High",
        "NSEC · INChO · IChO",
        "Chemical Thermodynamics, Thermochemistry & Equilibria",
        r"\b(chemical\s+thermodynamics|thermodynamics|thermochemistry|enthalpy|entropy|gibbs|hess'?s?\s+law|chemical\s+equilibrium|ionic\s+equilibrium|equilibri(?:um|a)|buffer\w*|solubility\s+product|\bksp\b|\bph\b|acid[\s-]*base\s+titration|salt\s+hydrolysis|le\s+chatelier)",
        "Chemical Thermodynamics Ionic Equilibrium ALK Sir",
        "Thermodynamics Equilibria NSEC Chemistry Olympiad",
        "Chemical Thermodynamics Thermochemistry Ionic Equilibrium NSEC INChO",
        "Ionic Equilibrium Thermodynamics NSEC Vedantu Olympiad School Olympiad Wallah",
        "Chemical Thermodynamics Acid Base Equilibria MIT 5.111 DexterChem IITian Explains",
    ),
    (
        25,
        "Chemistry Olympiad",
        "Physical Chemistry",
        "Class 12",
        "Very High",
        "NSEC · INChO · IChO",
        "Chemical Kinetics & Electrochemistry (NSEC / INChO)",
        r"\b(chemical\s+kinetics|kinetics|rate\s+law|order\s+of\s+reaction|arrhenius|steady\s+state\s+approximation|michaelis[\s-]*menten|catalysis|electrochemistry|nernst|galvanic|electrolytic|conductance|kohlrausch|latimer)",
        "Chemical Kinetics Electrochemistry ALK Sir DexterChem",
        "Electrochemistry Kinetics NSEC INChO Chemistry",
        "Chemical Kinetics Electrochemistry NSEC INChO One Shot",
        "Chemical Kinetics Electrochemistry NSEC Vedantu Olympiad School Olympiad Wallah",
        "Electrochemistry Nernst Kinetics IITian Explains The Organic Chemistry Tutor MIT",
    ),
    (
        26,
        "Chemistry Olympiad",
        "Inorganic & Quantum",
        "Class 11–12",
        "Very High",
        "NSEC · INChO · IChO",
        "Atomic Structure, Quantum & Chemical Bonding / MO Theory",
        r"\b(atomic\s+structure|structure\s+of\s+atom|quantum\s+numbers?|schrodinger|wave\s*function|radial\s+nodes?|chemical\s+bonding|molecular\s+orbital|\bmot\b|\bvsepr\b|hybridization|dipole\s+moment|fajan\w*|molecular\s+structure|bent'?s?\s+rule)",
        "Chemical Bonding Molecular Orbital Theory ALK Sir",
        "Atomic Structure Chemical Bonding NSEC Chemistry",
        "Atomic Structure Quantum Chemical Bonding MOT NSEC INChO",
        "Molecular Orbital Theory Chemical Bonding NSEC VOS Olympiad Wallah",
        "Quantum Atomic Structure Chemical Bonding MIT 5.111 IITian Explains Professor Dave",
    ),
    (
        27,
        "Chemistry Olympiad",
        "Inorganic & Quantum",
        "Class 12",
        "High",
        "NSEC · INChO · IChO",
        "Coordination Chemistry, Main Group & Transition Elements",
        r"\b(coordination\s+(?:compounds?|chemistry)|crystal\s+field|\bcft\b|ligand\s+field|\blft\b|werner|organometallics?|p[\s-]*block|d\s*(?:and|&)?\s*f[\s-]*block|transition\s+(?:elements?|metals?)|main\s+group|boranes?|silicates?|salt\s+analysis|qualitative\s+analysis)",
        "Coordination Compounds Chemistry ALK Sir DexterChem",
        "Coordination Chemistry Main Group NSEC Olympiad",
        "Coordination Chemistry Crystal Field Transition Elements NSEC INChO",
        "Coordination Chemistry CFT NSEC Vedantu Olympiad School Olympiad Wallah",
        "Coordination Compounds Transition Metals IITian Explains Professor Dave MIT",
    ),
    (
        28,
        "Chemistry Olympiad",
        "Organic & Spectroscopy",
        "Class 11–12",
        "Very High",
        "NSEC · INChO · IChO",
        "General Organic Chemistry (GOC) & Stereochemistry",
        r"\b(general\s+organic\s+chemistry|\bgoc\b|aromaticity|resonance|hyperconjugation|inductive\s+effect|carbocation|acidic\s+strength|basic\s+strength|stereochemistry|stereoisomerism|optical\s+isomerism|geometrical\s+isomerism|chirality|enantiomers?|diastereomers?|conformational|r\s*(?:and|&|/)\s*s\s+configuration)",
        "GOC Stereochemistry Sachin Rana NS Sir",
        "General Organic Chemistry Stereochemistry NSEC",
        "General Organic Chemistry GOC Stereochemistry NSEC INChO",
        "Stereochemistry GOC IITian Explains Sachin Rana VOS Olympiad Wallah",
        "Chirality Stereochemistry Conformations MIT 5.12 The Organic Chemistry Tutor",
    ),
    (
        29,
        "Chemistry Olympiad",
        "Organic & Spectroscopy",
        "Class 12",
        "Very High",
        "NSEC · INChO · IChO",
        "Organic Reaction Mechanisms, Carbonyls & Synthesis",
        r"\b(reaction\s+mechanisms?|\borm\b|\bsn1\b|\bsn2\b|\be1\b|\be2\b|elimination|nucleophilic|electrophilic|pericyclic|diels[\s-]*alder|aldehydes?|ketones?|carbonyl\w*|carboxylic|aldol|cannizzaro|grignard|enolate\w*|named?\s+reactions?|organic\s+synthesis|retrosynthesis|hydrocarbons?)",
        "Organic Reaction Mechanism Sachin Rana NS Sir",
        "Carbonyl Compounds Reaction Mechanisms NSEC INChO",
        "Organic Reaction Mechanisms Carbonyls Aldol Synthesis NSEC INChO",
        "Organic Reaction Mechanisms Synthesis IITian Explains Sachin Rana Olympiad Wallah",
        "Carbonyl Chemistry Aldol Enolates MIT 5.12 The Organic Chemistry Tutor VOS",
    ),
    (
        30,
        "Chemistry Olympiad",
        "Organic & Spectroscopy",
        "Class 12",
        "High",
        "NSEC · INChO · IChO",
        "Spectroscopy, Biomolecules & NSEC / INChO Past Paper Walkthroughs",
        r"\b(spectroscop\w*|\bnmr\b|infrared|\bir\s+spectroscop\w*|mass\s+spectrometr\w*|\buv[\s-]*vis\b|chemical\s+shift|biomolecules?|carbohydrates?|amino\s+acids?|peptides?|proteins?\s+chemistry|\bnsec\b|\bincho\b|\bicho\b)",
        "NMR IR Spectroscopy Organic Chemistry Professor Dave",
        "NSEC INChO Previous Year Paper Solutions",
        "Spectroscopy Biomolecules NSEC INChO Past Paper Solutions",
        "NMR IR Mass Spectroscopy Professor Dave Explains The Organic Chemistry Tutor",
        "NSEC INChO Paper Solutions Biomolecules Vedantu Olympiad School Olympiad Wallah IITian Explains",
    ),

    # ============ 4. JR SCIENCE & ASTRONOMY (NSEJS · IJSO · NSEA · IOAA — 5 Modules) ============
    (
        31,
        "Jr Science & Astronomy",
        "Junior Science (NSEJS / IJSO)",
        "Class 8–10",
        "Very High",
        "NSEJS · IJSO",
        "NSEJS / IJSO Physics Problem Solving",
        r"\b(nsejs|ijso|injso|junior\s+science)\b.*\b(physics|mechanics|light|optics|electricity|current|magnetism|force|motion|gravitation|heat|fluid\w*|work|energy|power|sound|kinematics|laws?\s+of\s+motion)\b|\b(physics|electricity|optics|mechanics|light|motion|force|heat|fluids?|kinematics)\b.*\b(nsejs|ijso|injso|junior\s+science)\b",
        "NSEJS Physics Vedantu Olympiad School",
        "NSEJS IJSO Physics Olympiad Wallah",
        "NSEJS IJSO Physics Problem Solving Marathon One Shot",
        "NSEJS Physics Electricity Light Mechanics Vedantu Olympiad School Olympiad Wallah",
        "IJSO INJSO Physics Problem Solving ALLEN Unacademy",
    ),
    (
        32,
        "Jr Science & Astronomy",
        "Junior Science (NSEJS / IJSO)",
        "Class 8–10",
        "Very High",
        "NSEJS · IJSO",
        "NSEJS / IJSO Chemistry & Mole/Equivalent Mastery",
        r"\b(nsejs|ijso|injso|junior\s+science)\b.*\b(chemistry|mole|stoichiometry|equivalent|redox|atomic|periodic|acid\w*|bases?|salts?|metals?|carbon|chemical|gas\s+laws?|equilibrium|titration)\b|\b(chemistry|mole\s+concept|equivalent\s+concept|redox|stoichiometry|atomic\s+structure|periodic\s+table)\b.*\b(nsejs|ijso|injso|junior\s+science)\b",
        "NSEJS Chemistry Vedantu Olympiad School",
        "NSEJS IJSO Chemistry Olympiad Wallah",
        "NSEJS IJSO Chemistry Mole Concept Equivalent Marathon",
        "NSEJS Mole Concept Equivalent Chemistry Vedantu Olympiad School Olympiad Wallah",
        "IJSO INJSO Chemistry Problem Solving ALLEN Unacademy",
    ),
    (
        33,
        "Jr Science & Astronomy",
        "Junior Science (NSEJS / IJSO)",
        "Class 8–10",
        "Very High",
        "NSEJS · IJSO",
        "NSEJS / IJSO Cell Biology, Genetics & Physiology",
        r"\b(nsejs|ijso|injso|junior\s+science|inbo|ibo)\b.*\b(biology|cell|genetics|heredity|physiology|life\s+processes|control|reproduction|ecology|evolution|digestion|respiration|circulation|excretion|diversity|plant|human|tissue\w*)\b|\b(biology|cell\s+biology|genetics|physiology|mendel\w*|mitosis|meiosis|organelles?)\b.*\b(nsejs|ijso|injso|junior\s+science|inbo|ibo)\b|\b(cell\s+biology|mendelian\s+genetics|molecular\s+genetics|human\s+physiology|cellular\s+respiration|mitosis\s+and\s+meiosis)\b",
        "NSEJS Biology Vedantu Olympiad School",
        "NSEJS IJSO Biology Olympiad Wallah",
        "NSEJS IJSO Cell Biology Genetics Physiology Marathon",
        "NSEJS Biology Cell Genetics Physiology Vedantu Olympiad School Olympiad Wallah",
        "Genetics Cell Biology MIT 7.012 Professor Dave Explains",
    ),
    (
        34,
        "Jr Science & Astronomy",
        "Astronomy & Astrophysics",
        "Class 9–12",
        "Very High",
        "NSEA · IOAA",
        "NSEA / IOAA Astronomy, Celestial Mechanics & Astrophysics",
        r"\b(nsea|inao|ioaa|astronomy\s+olympiad|astrophysics|astronomy|celestial\s+(?:mechanics|sphere|coordinates?)|stellar|hr\s+diagram|hertzsprung|cosmology|exoplanets?|black\s+holes?|neutron\s+stars?|supernova\w*|galax(?:y|ies)|hubble|redshift|parallax|solar\s+system|telescopes?)",
        "NSEA IOAA Astronomy Olympiad",
        "Astronomy Astrophysics Professor Dave Explains MIT OpenCourseWare",
        "NSEA IOAA Astronomy Celestial Mechanics Astrophysics",
        "NSEA IOAA Astronomy Olympiad Vedantu Olympiad School Olympiad Wallah",
        "Astrophysics Cosmology Stellar Evolution Dr. Becky PBS Space Time",
    ),
    (
        35,
        "Jr Science & Astronomy",
        "Contest Sprints & Past Papers",
        "Class 8–12",
        "High",
        "NSEJS · IJSO · NSEA",
        "NSEJS, IJSO & NSEA Sprint Revisions & Past Papers",
        r"\b(nsejs|ijso|injso|nsea|inao|ioaa)\b.*\b(paper\s+solution\w*|paper\s+discussion|past\s+papers?|pyq\w*|previous\s+year|sprint|revision|marathon|mock\s+test|complete\s+paper|question\s+paper|201\d|202\d)\b|\b(pyq\w*|past\s+papers?|paper\s+solution\w*|sprint|marathon|mock\s+test)\b.*\b(nsejs|ijso|injso|nsea|inao|ioaa)\b",
        "NSEJS Previous Year Question Papers Solutions",
        "NSEA NSEJS Sprint Revision Marathon",
        "NSEJS IJSO NSEA Past Paper Solutions PYQ Marathon",
        "NSEJS Previous Year Paper Solutions Vedantu Olympiad School Olympiad Wallah",
        "NSEA IJSO Sprint Revision PYQ ALLEN Unacademy",
    ),

    # ============ 5. INFORMATICS OLYMPIAD (ZCO · ZIO · INOI · IOI — 5 Modules) ============
    (
        36,
        "Informatics Olympiad",
        "Algorithms & ZCO",
        "Class 8–12",
        "Very High",
        "ZCO · ZIO · INOI · IOI",
        "Greedy, Sorting, Binary Search & Prefix Sums (ZCO / CP)",
        r"\b(greedy\s+algorithm\w*|\bgreedy\b|binary\s+search|sorting\s+algorithm\w*|merge\s+sort|quick\s*sort|prefix\s+sums?|two\s+pointers?|sliding\s+window|difference\s+array|\bzco\b|zonal\s+computing\s+olympiad)",
        "Binary Search Playlist",
        "Greedy Algorithms Sorting Playlist",
        "Binary Search Greedy Prefix Sums Competitive Programming",
        "Binary Search Prefix Sums Two Pointers Striver NeetCode Errichto",
        "Greedy Sorting Algorithms Abdul Bari TLE Eliminators Colin Galen Luv",
    ),
    (
        37,
        "Informatics Olympiad",
        "Algorithms & ZCO",
        "Class 8–12",
        "High",
        "ZCO · ZIO · INOI",
        "Recursion, Backtracking & Combinatorial ZIO Problem Solving",
        r"\b(recursion|recursive\s+algorithms?|backtracking|n[\s-]*queens?|sudoku|subsets?\s+generation|divide\s+(?:and|&)\s+conquer|\bzio\b|zonal\s+informatics\s+olympiad|indian\s+computing\s+olympiad)",
        "Recursion Backtracking Striver take U forward",
        "Recursion Backtracking Luv Abdul Bari NeetCode",
        "Recursion Backtracking Competitive Programming ZIO",
        "Recursion Backtracking Striver Errichto NeetCode Abdul Bari",
        "ZIO Zonal Informatics Olympiad Vedantu Olympiad School TLE Eliminators Utkarsh Gupta",
    ),
    (
        38,
        "Informatics Olympiad",
        "Dynamic Programming",
        "Class 9–12",
        "Very High",
        "ZCO · INOI · IOI",
        "Dynamic Programming (DP) Mastery for ZCO / INOI / IOI",
        r"\b(dynamic\s+programming|\bdp\s+(?:on\s+trees?|with\s+bitmasks?|series|playlist|mastery|tutorial|lecture\w*|problems?|for\s+competitive|optimizations?|contest)|bitmask\s+dp|digit\s+dp|knapsack|longest\s+(?:increasing|common)\s+subsequence|atcoder\s+dp|\binoi\b|\bioi\b)",
        "Dynamic Programming Striver Kartik Arora",
        "Dynamic Programming Competitive Programming Errichto Luv",
        "Dynamic Programming Complete Course Competitive Programming INOI",
        "Dynamic Programming AtCoder DP Errichto Kartik Arora Utkarsh Gupta",
        "Dynamic Programming Trees Bitmask Colin Galen TLE Eliminators NeetCode MIT 6.006",
    ),
    (
        39,
        "Informatics Olympiad",
        "Graph & Tree Structures",
        "Class 9–12",
        "Very High",
        "ZCO · INOI · IOI",
        "Graph Algorithms (BFS, DFS, Dijkstra, Trees, DSU)",
        r"\b(graph\s+(?:algorithms?|theory)|graphs?\s+(?:playlist|series|in\s+c\+\+|competitive|algorithms?)|breadth\s+first|\bbfs\b|depth\s+first|\bdfs\b|dijkstra\w*|bellman[\s-]*ford|floyd[\s-]*warshall|shortest\s+path\w*|spanning\s+tree|\bmst\b|kruskal\w*|prim'?s?|disjoint\s+set|\bdsu\b|union[\s-]*find|topological\s+sort|bridges?\s+and\s+articulation|strongly\s+connected|tree\s+algorithms?|lowest\s+common\s+ancestor|\blca\b)",
        "Graph Theory Algorithms WilliamFiset Striver CodeNCode",
        "Graph Algorithms Competitive Programming Luv TLE Eliminators",
        "Graph Algorithms BFS DFS Dijkstra DSU Trees Competitive Programming",
        "Graph Algorithms BFS DFS Dijkstra WilliamFiset Striver NeetCode Abdul Bari",
        "Disjoint Set Union Tree Algorithms Errichto CodeNCode Colin Galen Utkarsh Gupta",
    ),
    (
        40,
        "Informatics Olympiad",
        "Graph & Tree Structures",
        "Class 10–12",
        "Very High",
        "ZCO · INOI · IOI",
        "Segment Trees, Fenwick Trees & ZCO/INOI Competitive Programming",
        r"\b(segment\s+trees?|lazy\s+propagation|fenwick\s+trees?|binary\s+indexed\s+trees?|range\s+queries|sparse\s+table|sqrt\s+decomposition|mo'?s?\s+algorithm|heavy[\s-]*light|centroid\s+decomposition|inoi\s+(?:problems?|solutions?|past\s+papers?|preparation)|competitive\s+programming\s+(?:zco|inoi|ioi))",
        "Segment Tree Playlist",
        "Fenwick Tree Range Queries Playlist",
        "Segment Trees Lazy Propagation Fenwick Tree Competitive Programming",
        "Segment Tree Lazy Propagation Striver Errichto Kartik Arora Utkarsh Gupta",
        "Fenwick Tree Binary Indexed Tree Sparse Table WilliamFiset Luv TLE Eliminators NeetCode",
    ),
]

SUBJECT_TO_EXAM: dict[str, str] = {
    "Maths Olympiad": "IOQM / INMO",
    "Physics Olympiad": "NSEP / INPhO",
    "Chemistry Olympiad": "NSEC / INChO",
    "Jr Science & Astronomy": "NSEJS / NSEA",
    "Informatics Olympiad": "ZCO / INOI",
}

TEACHER_PLAYLIST_SWEEPS: list[tuple[str, str]] = [
    # Maths Olympiad Sweeps
    ("Maths Olympiad", "Vedantu Olympiad School IOQM RMO INMO"),
    ("Maths Olympiad", "Olympiad Wallah IOQM RMO INMO"),
    ("Maths Olympiad", "Prashant Jain IOQM PRMO Maths"),
    ("Maths Olympiad", "Cheenta Mathematics Olympiad IOQM RMO INMO"),
    ("Maths Olympiad", "Mathsmerizing Olympiad Symposium"),
    ("Maths Olympiad", "Maths Unplugged Olympiad"),
    ("Maths Olympiad", "Michael Penn Math Olympiad IMO"),
    ("Maths Olympiad", "3Blue1Brown Olympiad Math"),
    # Physics Olympiad Sweeps
    ("Physics Olympiad", "Indian School of Physics Pathfinder INPhO"),
    ("Physics Olympiad", "Physics Sir JEE Pathfinder Olympiad"),
    ("Physics Olympiad", "Physics Galaxy NSEP INPhO Advanced Illustrations"),
    ("Physics Olympiad", "Vedantu Olympiad School NSEP INPhO"),
    ("Physics Olympiad", "Olympiad Wallah NSEP INPhO Physics"),
    ("Physics Olympiad", "Vinay Uppal Physics Pathfinder"),
    ("Physics Olympiad", "Physics Heist Olympiad Physics"),
    ("Physics Olympiad", "MIT OpenCourseWare Classical Mechanics Electricity Magnetism"),
    # Chemistry Olympiad Sweeps
    ("Chemistry Olympiad", "Vedantu Olympiad School NSEC INChO Chemistry"),
    ("Chemistry Olympiad", "Olympiad Wallah NSEC INChO Chemistry"),
    ("Chemistry Olympiad", "IITian Explains Olympiad Organic Inorganic Physical"),
    ("Chemistry Olympiad", "Sachin Rana IITB Organic Chemistry"),
    ("Chemistry Olympiad", "DexterChem Physical Inorganic Organic"),
    ("Chemistry Olympiad", "ALK Sir NS Sir Mohit Tyagi Chemistry"),
    ("Chemistry Olympiad", "Professor Dave Explains Organic General Chemistry"),
    ("Chemistry Olympiad", "MIT OpenCourseWare Chemistry 5.111 5.12"),
    # Jr Science & Astronomy Sweeps
    ("Jr Science & Astronomy", "Vedantu Olympiad School NSEJS IJSO"),
    ("Jr Science & Astronomy", "Vedantu Olympiad School NSEA IOAA Astronomy"),
    ("Jr Science & Astronomy", "Olympiad Wallah NSEJS IJSO NSEA"),
    ("Jr Science & Astronomy", "Dr. Becky Astrophysics Astronomy"),
    ("Jr Science & Astronomy", "PBS Space Time Astrophysics Cosmology"),
    ("Jr Science & Astronomy", "Professor Dave Explains Astronomy Biology"),
    # Informatics Olympiad Sweeps
    ("Informatics Olympiad", "take U forward Striver Dynamic Programming Graphs Binary Search"),
    ("Informatics Olympiad", "Errichto Algorithms Competitive Programming"),
    ("Informatics Olympiad", "WilliamFiset Graph Theory Data Structures"),
    ("Informatics Olympiad", "CodeNCode Graph Theory Segment Tree Number Theory"),
    ("Informatics Olympiad", "Luv Competitive Programming Course"),
    ("Informatics Olympiad", "Colin Galen Competitive Programming"),
    ("Informatics Olympiad", "TLE Eliminators Priyansh Competitive Programming"),
    ("Informatics Olympiad", "Kartik Arora Dynamic Programming Segment Trees"),
    ("Informatics Olympiad", "NeetCode Graphs Backtracking Dynamic Programming"),
    ("Informatics Olympiad", "Abdul Bari Algorithms"),
    ("Informatics Olympiad", "MIT OpenCourseWare 6.006 Introduction to Algorithms"),
]

CHANNEL_VIDEO_SWEEPS: list[tuple[str, str]] = [
    ("Maths Olympiad", "Vedantu Olympiad School IOQM Marathon"),
    ("Maths Olympiad", "Olympiad Wallah IOQM RMO Marathon"),
    ("Maths Olympiad", "Michael Penn International Math Olympiad"),
    ("Physics Olympiad", "Indian School of Physics Pathfinder Solutions"),
    ("Physics Olympiad", "Physics Sir JEE Olympiad Pathfinder"),
    ("Physics Olympiad", "Vedantu Olympiad School NSEP Marathon"),
    ("Physics Olympiad", "Olympiad Wallah NSEP INPhO Marathon"),
    ("Chemistry Olympiad", "Vedantu Olympiad School NSEC Marathon"),
    ("Chemistry Olympiad", "Olympiad Wallah NSEC INChO Marathon"),
    ("Chemistry Olympiad", "IITian Explains NSEC Olympiad Chemistry"),
    ("Jr Science & Astronomy", "Vedantu Olympiad School NSEJS Physics Chemistry Biology"),
    ("Jr Science & Astronomy", "Olympiad Wallah NSEJS IJSO NSEA Marathon"),
    ("Informatics Olympiad", "Utkarsh Gupta Competitive Programming DP Segment Tree"),
    ("Informatics Olympiad", "Vedantu Olympiad School ZIO ZCO INOI"),
]

# Curated Allowlist of Legitimate Olympiad, Deep STEM & Competitive Programming Channels
VERIFIED_SUBSTRING_PATTERNS = (
    # Dedicated Olympiad Institutes & Educators
    "vedantu olympiad",
    "prashant jain",
    "pj sir",
    "olympiad corner",
    "jee math rankers",
    "mathsmerizing",
    "maths unplugged",
    "cheenta",
    "olympiad wallah",
    "pw olympiad",
    "jee challengers",
    # Deep JEE/Olympiad Physics & Chemistry Specialists
    "indian school of physics",
    "physics sir jee",
    "vinay uppal",
    "physics heist",
    "physics galaxy",
    "mohit tyagi",
    "competishun",
    "iitian explains",
    "sachin rana",
    "dexterchem",
    # Global STEM, Math, Chemistry & Astrophysics Channels
    "3blue1brown",
    "michael penn",
    "mindyourdecisions",
    "mit opencourseware",
    "stand-up maths",
    "standupmaths",
    "numberphile",
    "the organic chemistry tutor",
    "professor dave explains",
    "dr. becky",
    "dr becky",
    "pbs space time",
    # Competitive Programming & Informatics Olympiad Channels
    "take u forward",
    "striver",
    "errichto",
    "williamfiset",
    "william fiset",
    "codencode",
    "colin galen",
    "abdul bari",
    "neetcode",
    "kartik arora",
    "tle eliminators",
    "priyansh agarwal",
    "utkarsh gupta",
)

CP_ONLY_PATTERNS = (
    "take u forward",
    "striver",
    "errichto",
    "williamfiset",
    "william fiset",
    "codencode",
    "colin galen",
    "abdul bari",
    "neetcode",
    "kartik arora",
    "tle eliminators",
    "priyansh agarwal",
    "utkarsh gupta",
)

ENGLISH_MEDIUM_CUES = (
    "3blue1brown",
    "michael penn",
    "mindyourdecisions",
    "mit opencourseware",
    "stand-up maths",
    "standupmaths",
    "numberphile",
    "the organic chemistry tutor",
    "professor dave explains",
    "dr. becky",
    "dr becky",
    "pbs space time",
    "errichto",
    "williamfiset",
    "william fiset",
    "colin galen",
    "abdul bari",
    "neetcode",
    "take u forward",
    "striver",
    "codencode",
    "indian school of physics",
    "physics sir jee",
    "vinay uppal",
    "physics heist",
    "physics galaxy",
    "mathsmerizing",
    "cheenta",
)

# Strict Rejections: Vlogs, Cutoffs, Registration/Admit-Card Announcements, Strategy Fluff, Shorts, Regional non-EN/HI
HARD_REJECT_RE = re.compile(
    r"\b(vlog\w*|prank|controversy|exposed|roast|reaction\s+video|"
    r"cutoff\w*|cut[\s-]*off\w*|marks\s+vs\s+(?:rank|percentile)|expected\s+cutoff|"
    r"registration\s+(?:process|open|date|form|started)|how\s+to\s+register|form\s+filling|"
    r"admit\s+card|hall\s+ticket|exam\s+date\s+announced|result\s+(?:out|declared|reaction)|"
    r"answer\s+key\s+challenge|certificate\s+download|eligibility\s+criteria|"
    r"syllabus\s+and\s+eligibility|all\s+about\s+(?:ioqm|nsep|nsec|nsejs|nsea|zco|zio|inmo)|"
    r"how\s+to\s+prepare|strategy\s*(?:&|and)\s*roadmap|complete\s+strategy|batch\s+launch|course\s+launch|orientation\s+session|"
    r"college\s+review|hostel\s+tour|josaa|counselling|dress\s+code|"
    r"toppers?\s+talk|topper'?s?\s+interview|success\s+story|success\s+meet|parents\s+reaction|"
    r"best\s+books\s+for|book\s+review|time\s*table|how\s+to\s+manage\s+school|"
    r"motivation|motivational|shorts|#shorts|#ytshorts|"
    r"vaathi|tamil|telugu|malayalam|kannada|bangla|bengali|marathi|gujarati|odia)\b",
    re.I,
)


def parse_views(text: str) -> int:
    if not text:
        return 0
    cleaned = text.lower().replace(",", "").strip()
    m = re.search(r"([\d.]+)\s*([kmb]|lakh|cr)?", cleaned)
    if not m:
        return 0
    val = float(m.group(1))
    mult = m.group(2) or ""
    if mult == "k":
        val *= 1_000
    elif mult == "m":
        val *= 1_000_000
    elif mult == "b":
        val *= 1_000_000_000
    elif mult == "lakh":
        val *= 100_000
    elif mult == "cr":
        val *= 10_000_000
    return int(val)


def parse_duration_seconds(text: str) -> int:
    if not text:
        return 0
    parts = [int(p) for p in re.findall(r"\d+", text)]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 1:
        return parts[0]
    return 0


def parse_lesson_count(text: str) -> int:
    if not text:
        return 0
    m = re.search(r"(\d+)", text.replace(",", ""))
    return int(m.group(1)) if m else 0


def search_youtube(query: str, params: str = "", use_cache: bool = True) -> dict:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_id = f"{query}::sp={params}" if params else query
    key = hashlib.sha1(cache_id.encode("utf-8")).hexdigest()
    cpath = CACHE_DIR / f"{key}.json"
    if use_cache and cpath.exists():
        with _lock:
            STATS["cached"] += 1
        return json.loads(cpath.read_text(encoding="utf-8"))

    body: dict = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20250101.00.00",
                "hl": "en",
                "gl": "IN",
            }
        },
        "query": query,
    }
    if params:
        body["params"] = params
    payload = json.dumps(body).encode("utf-8")

    last_err = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(
                INNERTUBE_SEARCH,
                data=payload,
                headers={"User-Agent": UA, "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
                data = json.load(resp)
            with _lock:
                STATS["requests"] += 1
            cpath.write_text(json.dumps(data), encoding="utf-8")
            return data
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(0.7 * (attempt + 1))
    print(f"WARN: search failed for {query!r}: {last_err}", flush=True)
    return {}


def extract_candidates(payload: dict) -> list[dict]:
    items = []
    try:
        sections = (
            payload["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]
            ["sectionListRenderer"]["contents"]
        )
    except (KeyError, TypeError):
        return items

    for sec in sections:
        contents = sec.get("itemSectionRenderer", {}).get("contents", [])
        for entry in contents:
            if "lockupViewModel" in entry:
                parsed = _parse_lockup(entry["lockupViewModel"])
                if parsed:
                    items.append(parsed)
            elif "playlistRenderer" in entry:
                parsed = _parse_legacy_playlist(entry["playlistRenderer"])
                if parsed:
                    items.append(parsed)
            elif "videoRenderer" in entry:
                parsed = _parse_video(entry["videoRenderer"])
                if parsed:
                    items.append(parsed)
    return items


def _parse_lockup(lv: dict) -> dict | None:
    cid = (lv.get("contentId") or "").strip()
    ctype = lv.get("contentType") or ""
    if not cid or ("PLAYLIST" not in ctype and "COURSE" not in ctype and not cid.startswith("PL")):
        return None
    if cid.startswith("RD"):
        return None

    meta_vm = lv.get("metadata", {}).get("lockupMetadataViewModel", {})
    title = (meta_vm.get("title", {}).get("content") or "").strip()
    if not title:
        return None

    rows = (
        meta_vm.get("metadata", {})
        .get("contentMetadataViewModel", {})
        .get("metadataRows", [])
    )
    channel = ""
    channel_url = ""
    sample_lectures: list[dict] = []

    for row in rows:
        parts = row.get("metadataParts") or []
        for part in parts:
            txt_obj = part.get("text") or {}
            content = (txt_obj.get("content") or "").strip()
            if not content or content.lower() in {"playlist", "course", "view full playlist", "view full course", "podcast"}:
                continue
            cmd_runs = txt_obj.get("commandRuns") or []
            web_url = ""
            watch_vid = ""
            if cmd_runs:
                icmd = cmd_runs[0].get("onTap", {}).get("innertubeCommand", {})
                web_url = icmd.get("commandMetadata", {}).get("webCommandMetadata", {}).get("url") or ""
                watch_vid = icmd.get("watchEndpoint", {}).get("videoId") or ""

            if not channel and (web_url.startswith("/@") or web_url.startswith("/channel/") or web_url.startswith("/c/")):
                channel = content
                channel_url = f"https://www.youtube.com{web_url}"
            elif watch_vid and len(sample_lectures) < 4:
                sample_lectures.append(
                    {
                        "video_id": watch_vid,
                        "title": content,
                        "url": f"https://www.youtube.com/watch?v={watch_vid}&list={cid}",
                    }
                )

    if not channel and rows:
        first_parts = rows[0].get("metadataParts") or []
        if first_parts:
            channel = (first_parts[0].get("text", {}).get("content") or "").strip()

    thumb_vm = (
        lv.get("contentImage", {})
        .get("collectionThumbnailViewModel", {})
        .get("primaryThumbnail", {})
        .get("thumbnailViewModel", {})
    )
    sources = thumb_vm.get("image", {}).get("sources") or []
    thumbnail = sources[-1]["url"] if sources else ""

    lesson_count = 0
    for ov in thumb_vm.get("overlays") or []:
        badges = ov.get("thumbnailOverlayBadgeViewModel", {}).get("thumbnailBadges") or []
        for b in badges:
            btxt = b.get("thumbnailBadgeViewModel", {}).get("text") or ""
            cnt = parse_lesson_count(btxt)
            if cnt:
                lesson_count = cnt
                break

    embed_vid = sample_lectures[0]["video_id"] if sample_lectures else ""
    if not embed_vid and thumbnail:
        m = re.search(r"/vi/([A-Za-z0-9_-]{11})/", thumbnail)
        if m:
            embed_vid = m.group(1)

    return {
        "provider": "playlist",
        "video_id": cid,
        "embed_video_id": embed_vid,
        "url": f"https://www.youtube.com/playlist?list={cid}",
        "title": title,
        "channel": channel or "Olympiad Faculty",
        "channel_url": channel_url,
        "thumbnail": thumbnail,
        "lesson_count": lesson_count,
        "duration": "",
        "duration_sec": 0,
        "views_text": "",
        "view_count": 0,
        "published": "",
        "sample_lectures": sample_lectures,
    }


def _parse_legacy_playlist(pr: dict) -> dict | None:
    cid = (pr.get("playlistId") or "").strip()
    title = (pr.get("title", {}).get("simpleText") or "").strip()
    if not cid or not title or cid.startswith("RD"):
        return None
    runs = pr.get("shortBylineText", {}).get("runs") or pr.get("longBylineText", {}).get("runs") or []
    channel = (runs[0].get("text") if runs else "").strip() or "Olympiad Faculty"
    thumbs = pr.get("thumbnails", [{}])[0].get("thumbnails") or []
    thumbnail = thumbs[-1].get("url", "") if thumbs else ""
    embed_vid = ""
    if thumbnail:
        m = re.search(r"/vi/([A-Za-z0-9_-]{11})/", thumbnail)
        if m:
            embed_vid = m.group(1)
    lesson_count = parse_lesson_count(pr.get("videoCount") or "")
    return {
        "provider": "playlist",
        "video_id": cid,
        "embed_video_id": embed_vid,
        "url": f"https://www.youtube.com/playlist?list={cid}",
        "title": title,
        "channel": channel,
        "channel_url": "",
        "thumbnail": thumbnail,
        "lesson_count": lesson_count,
        "duration": "",
        "duration_sec": 0,
        "views_text": "",
        "view_count": 0,
        "published": "",
        "sample_lectures": [],
    }


def _parse_video(vr: dict) -> dict | None:
    vid = (vr.get("videoId") or "").strip()
    runs = vr.get("title", {}).get("runs") or []
    title = "".join(r.get("text", "") for r in runs).strip()
    if not vid or not title or len(vid) != 11:
        return None

    owner_runs = vr.get("ownerText", {}).get("runs") or vr.get("longBylineText", {}).get("runs") or []
    channel = (owner_runs[0].get("text") if owner_runs else "").strip() or "Olympiad Faculty"
    channel_url = ""
    if owner_runs:
        wurl = (
            owner_runs[0]
            .get("navigationEndpoint", {})
            .get("commandMetadata", {})
            .get("webCommandMetadata", {})
            .get("url")
            or ""
        )
        if wurl:
            channel_url = f"https://www.youtube.com{wurl}"

    length_text = (vr.get("lengthText", {}).get("simpleText") or "").strip()
    dur_sec = parse_duration_seconds(length_text)

    views_text = (vr.get("viewCountText", {}).get("simpleText") or "").strip()
    view_count = parse_views(views_text)
    published = (vr.get("publishedTimeText", {}).get("simpleText") or "").strip()

    thumbs = vr.get("thumbnail", {}).get("thumbnails") or []
    thumbnail = thumbs[-1].get("url", "") if thumbs else f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"

    return {
        "provider": "youtube",
        "video_id": vid,
        "embed_video_id": vid,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "title": title,
        "channel": channel,
        "channel_url": channel_url,
        "thumbnail": thumbnail,
        "lesson_count": 0,
        "duration": length_text,
        "duration_sec": dur_sec,
        "views_text": views_text,
        "view_count": view_count,
        "published": published,
        "sample_lectures": [],
    }


def is_luv_cp_channel(channel: str, channel_url: str = "") -> bool:
    low = channel.strip().casefold()
    u_low = (channel_url or "").casefold()
    return low == "luv" or "/@luvisme" in u_low


def is_cp_only_channel(channel: str, channel_url: str = "") -> bool:
    low = channel.casefold()
    return is_luv_cp_channel(channel, channel_url) or any(p in low for p in CP_ONLY_PATTERNS)


def is_allen_olympiad_channel(channel: str) -> bool:
    low = channel.casefold()
    if re.search(r"\b(neet|next|commerce|cuet)\b", low) and "olympiad" not in low:
        return False
    return any(
        k in low
        for k in (
            "allen olympiad",
            "allen jee",
            "allen career institute",
            "allen digital",
            "allen online",
            "allen foundation",
            "tallentex",
        )
    )


def is_unacademy_olympiad_channel(channel: str) -> bool:
    low = channel.casefold()
    if re.search(
        r"\b(upsc|ias|psc|ssc|bank|ca\b|cs\b|clat|judiciary|law|defence|nda|cds|gate|ugc|net|tet|ctet|commerce|arts|tamil|telugu|malayalam|kannada|marathi|bengali|bangla|gujarati|odia)\b",
        low,
    ):
        return False
    if re.search(r"\bneet\b", low) and not re.search(r"\b(olympiad|jee|iit)\b", low):
        return False
    return any(
        k in low
        for k in (
            "unacademy olympiad",
            "olympiad corner",
            "unacademy jee",
            "unacademy atoms",
            "jee nexus",
            "kota pulse by unacademy",
            "let's crack iit jee",
            "unacademy",
        )
    )


def is_verified_olympiad_channel(channel: str, channel_url: str = "") -> bool:
    low = channel.strip().casefold()
    if not low:
        return False
    if "neetcode" in low:
        return True
    if is_luv_cp_channel(channel, channel_url):
        return True
    if re.search(r"\bvos\b", low):
        return True
    if is_allen_olympiad_channel(channel):
        return True
    if is_unacademy_olympiad_channel(channel):
        return True
    if re.search(r"\bneet\b", low) and not re.search(r"\b(olympiad|jee|iit)\b", low):
        return False
    return any(p in low for p in VERIFIED_SUBSTRING_PATTERNS)


def resolve_institute(cand: dict) -> str:
    ch_low = cand["channel"].lower()
    blob = f"{cand['title']} {cand['channel']}".lower()

    if "vedantu olympiad" in ch_low or re.search(r"\bvos\b", ch_low):
        return "Vedantu Olympiad School (VOS)"
    if any(k in ch_low for k in ("olympiad wallah", "pw olympiad", "jee challengers")):
        return "PW Olympiad Wallah"
    if "cheenta" in ch_low:
        return "Cheenta Olympiad"
    if any(
        k in ch_low
        for k in (
            "indian school of physics",
            "physics sir jee",
            "vinay uppal",
            "physics heist",
            "physics galaxy",
        )
    ):
        return "INSP, Physics Galaxy & Olympiad Physics"
    if any(k in ch_low for k in ("iitian explains", "sachin rana", "dexterchem")):
        return "IITian Explains, Sachin Rana & DexterChem"
    if any(k in ch_low for k in ("mathsmerizing", "maths unplugged", "mohit tyagi", "competishun")):
        return "Mathsmerizing, Maths Unplugged & Competishun"
    if is_cp_only_channel(cand["channel"], cand.get("channel_url", "")):
        return "IOI & Competitive Programming"
    if any(k in ch_low for k in ("prashant jain", "pj sir", "jee math rankers", "olympiad corner")) or is_unacademy_olympiad_channel(cand["channel"]):
        return "Unacademy & PJ Sir Olympiad"
    if is_allen_olympiad_channel(cand["channel"]):
        return "ALLEN Olympiad"
    if any(
        k in ch_low
        for k in (
            "mit opencourseware",
            "3blue1brown",
            "michael penn",
            "mindyourdecisions",
            "stand-up maths",
            "standupmaths",
            "numberphile",
            "the organic chemistry tutor",
            "professor dave explains",
            "dr. becky",
            "dr becky",
            "pbs space time",
        )
    ) or "mit opencourseware" in blob:
        return "MIT OCW & Global STEM"
    return "Independent Olympiad Specialists"


def resolve_educator(cand: dict, subject: str, unit: str) -> str:
    blob = f"{cand['title']} {cand['channel']}".lower()
    ch_low = cand["channel"].lower()

    if "vedantu olympiad" in ch_low or re.search(r"\bvos\b", ch_low):
        if "abhay mahajan" in blob or "abhay sir" in blob:
            return "Abhay Mahajan (VOS)"
        if "chetan garg" in blob or "chetan sir" in blob:
            return "Chetan Garg (VOS)"
        if "ajay singh" in blob:
            return "Ajay Singh (VOS)"
        return "Vedantu Olympiad School (VOS)"

    if "mohit tyagi" in ch_low or "competishun" in ch_low:
        if "Maths" in subject:
            return "MT Sir (Mohit Tyagi)"
        if "Physics" in subject:
            return "ABJ Sir (Mohit Tyagi)"
        if "Organic" in unit or re.search(r"\bns\s*sir\b|\bneeraj saini\b", blob):
            return "NS Sir (Mohit Tyagi)"
        return "ALK Sir (Mohit Tyagi)"

    if is_luv_cp_channel(cand["channel"], cand.get("channel_url", "")):
        return "Luv (Competitive Programming)"

    teacher_rules = [
        (r"prashant jain|\bpj\s*sir\b|jee math rankers", "Prashant Jain (PJ Sir)"),
        (r"olympiad wallah|pw olympiad|jee challengers", "PW Olympiad Wallah"),
        (r"cheenta", "Cheenta Olympiad Faculty"),
        (r"mathsmerizing", "Mathsmerizing"),
        (r"maths unplugged", "Sandal Sir (Maths Unplugged)"),
        (r"indian school of physics|\bnitin sachan\b|\binsp\b", "Nitin Sachan (INSP)"),
        (r"physics sir jee|\bjanardhan\b", "Janardhan Sir (Physics Sir JEE)"),
        (r"\bvinay uppal\b", "Vinay Uppal Sir"),
        (r"physics heist", "Physics Heist"),
        (r"physics galaxy|\bashish arora\b", "Ashish Arora (Physics Galaxy)"),
        (r"iitian explains|\bmka\s*sir\b|\bkashif alam\b", "MKA Sir (IITian Explains)"),
        (r"\bsachin rana\b", "Sachin Rana (IITB)"),
        (r"dexterchem|\bchaitanya rastogi\b", "Chaitanya Rastogi (DexterChem)"),
        (r"3blue1brown", "Grant Sanderson (3Blue1Brown)"),
        (r"michael penn", "Michael Penn"),
        (r"mindyourdecisions", "Presh Talwalkar (MindYourDecisions)"),
        (r"mit opencourseware", "MIT OpenCourseWare"),
        (r"stand-up maths|standupmaths", "Matt Parker (Stand-up Maths)"),
        (r"numberphile", "Numberphile"),
        (r"the organic chemistry tutor", "The Organic Chemistry Tutor"),
        (r"professor dave explains", "Professor Dave Explains"),
        (r"dr\.?\s*becky", "Dr. Becky Smethurst"),
        (r"pbs space time", "Matt O'Dowd (PBS Space Time)"),
        (r"take u forward|\bstriver\b", "Striver (take U forward)"),
        (r"errichto", "Kamil Debowski (Errichto)"),
        (r"william\s*fiset", "William Fiset"),
        (r"codencode", "CodeNCode"),
        (r"colin galen", "Colin Galen"),
        (r"abdul bari", "Abdul Bari"),
        (r"neetcode", "NeetCode"),
        (r"kartik arora", "Kartik Arora"),
        (r"tle eliminators|\bpriyansh agarwal\b", "Priyansh Agarwal (TLE Eliminators)"),
        (r"utkarsh gupta", "Utkarsh Gupta"),
    ]
    for pat, label in teacher_rules:
        if re.search(pat, blob):
            return label

    if is_allen_olympiad_channel(cand["channel"]):
        return "ALLEN Olympiad"
    if is_unacademy_olympiad_channel(cand["channel"]):
        return "Unacademy Olympiad"
    return cand["channel"]


def resolve_language(cand: dict) -> str:
    blob = f"{cand['title']} {cand['channel']}".lower()
    if any(cue in blob for cue in ENGLISH_MEDIUM_CUES) or re.search(r"\bin english\b|\benglish medium\b", blob):
        if not re.search(r"\bhindi\b", blob):
            return "English"
    return "Hinglish"


def classify_exam_and_format(cand: dict, subject: str) -> tuple[str, str]:
    title_low = cand["title"].lower()
    exam = SUBJECT_TO_EXAM[subject]

    if cand["provider"] == "playlist":
        fmt = "Full Course"
        if re.search(r"\b(pyq\w*|previous\s+year|past\s+papers?|paper\s+solution\w*|sprint|revision|mock)\b", title_low):
            fmt = "Revision & PYQs"
        elif re.search(
            r"\b(pathfinder|irodov|inmo|imo|inpho|ipho|incho|icho|symposium|illustrations?|problems?\s+series)\b",
            title_low,
        ):
            fmt = "Olympiad Problems"
    else:
        if re.search(r"\b(pyq\w*|previous\s+year|past\s+papers?|paper\s+solution\w*|paper\s+discussion|sprint|revision|mock)\b", title_low):
            fmt = "Revision & PYQs"
        elif (
            re.search(r"\b(one[\s-]*shot|marathon|complete\s+(?:chapter|lecture|course)|full\s+chapter)\b", title_low)
            or cand["duration_sec"] >= 5400
        ):
            fmt = "One-Shot"
        else:
            fmt = "Olympiad Problems"

    return exam, fmt


def is_valid_chapter_candidate(cand: dict, ch_no: int, subject: str, chapter_re: re.Pattern[str]) -> bool:
    title = cand["title"]
    channel = cand["channel"]
    channel_url = cand.get("channel_url", "")

    # 1. Must belong to our curated Olympiad / Deep STEM / Competitive Programming allowlist
    if not is_verified_olympiad_channel(channel, channel_url):
        return False

    # 2. Reject vlogs, cutoffs, registration/admit-card announcements, shorts, regional noise
    if HARD_REJECT_RE.search(title):
        return False
    if "neetcode" not in channel.casefold():
        if re.search(r"\bneet\b", title, re.I) and not re.search(
            r"\b(olympiad|ioqm|nsep|nsec|nsejs|ijso|nsea|inpho|incho|jee|iit)\b", title, re.I
        ):
            return False

    # 3. Duration (>= 8m / 480s) & Lesson Count Floor
    if cand["provider"] == "playlist":
        if cand["lesson_count"] == 1:
            return False
    else:
        if cand["duration_sec"] < MIN_VIDEO_SECONDS:
            return False

    # 4. Reject full-subject generic megacompilations ("all chapters in order") on playlists
    if cand["provider"] == "playlist" and re.search(
        r"\bin order\b|\ball chapters\b|\bcomplete (?:physics|chemistry|maths|biology)\b", title, re.I
    ):
        if ch_no not in {11, 12, 22, 30, 35}:
            return False

    ch_low = channel.casefold()
    title_clean = re.sub(r"#\w+", "", title)
    blob_tc = f"{title_clean} {channel}"

    # 5. Strict Stream Isolation & Cross-Subject Guards
    if subject == "Informatics Olympiad":
        # Must come from CP channels, MIT OCW, or Olympiad channels explicitly teaching ZCO/ZIO/INOI/IOI/Algorithms
        if any(
            k in ch_low
            for k in (
                "indian school of physics",
                "physics sir jee",
                "vinay uppal",
                "physics heist",
                "physics galaxy",
                "iitian explains",
                "sachin rana",
                "dexterchem",
                "dr. becky",
                "dr becky",
                "pbs space time",
                "the organic chemistry tutor",
                "professor dave explains",
                "michael penn",
                "numberphile",
                "stand-up maths",
                "standupmaths",
                "mindyourdecisions",
                "mohit tyagi",
                "competishun",
                "mathsmerizing",
                "maths unplugged",
            )
        ):
            return False
        if not is_cp_only_channel(channel, channel_url):
            if not re.search(
                r"\b(zco|zio|inoi|ioi|informatics\s+olympiad|computing\s+olympiad|algorithm\w*|competitive\s+programming|dynamic\s+programming|binary\s+search|graph\s+algorithms?|segment\s+tree|fenwick|6\.006|6\.046)\b",
                title_clean,
                re.I,
            ):
                return False
    else:
        # Non-Informatics streams must NEVER accept Competitive Programming channels or coding videos
        if is_cp_only_channel(channel, channel_url):
            return False
        if re.search(
            r"\b(leetcode|codeforces|codechef|atcoder|c\+\+|java\b|dsa\b|striver|segment\s+tree|fenwick\s+tree|binary\s+search\s+algorithm|dynamic\s+programming|\bzco\b|\bzio\b|\binoi\b)\b",
            title_clean,
            re.I,
        ):
            return False

    if subject == "Maths Olympiad":
        if any(
            k in ch_low
            for k in (
                "indian school of physics",
                "physics sir jee",
                "vinay uppal",
                "physics heist",
                "physics galaxy",
                "iitian explains",
                "sachin rana",
                "dexterchem",
                "dr. becky",
                "dr becky",
                "pbs space time",
                "professor dave explains",
            )
        ):
            return False
        if re.search(
            r"\b(nsep|inpho|ipho|nsec|incho|icho|nsejs|ijso|nsea|ioaa|physics|chemistry|biology|astrophysics|kinematics|electrostatics|thermodynamics|mole\s+concept|organic\s+chemistry|abj\s+sir|alk\s+sir|ns\s+sir)\b",
            blob_tc if "physics wallah" not in ch_low else title_clean,
            re.I,
        ):
            return False
    elif subject == "Physics Olympiad":
        if any(
            k in ch_low
            for k in (
                "mathsmerizing",
                "maths unplugged",
                "prashant jain",
                "pj sir",
                "jee math rankers",
                "michael penn",
                "mindyourdecisions",
                "stand-up maths",
                "standupmaths",
                "numberphile",
                "iitian explains",
                "sachin rana",
                "dexterchem",
                "dr. becky",
                "dr becky",
                "pbs space time",
            )
        ):
            return False
        if re.search(
            r"\b(ioqm|prmo|rmo|inmo|nsec|incho|icho|nsejs|ijso|nsea|ioaa|chemistry|biology|organic\s+chemistry|inorganic|mole\s+concept|thermochemistry|enthalpy|gibbs|chemical\s+thermodynamics|chemical\s+kinetics|ionic\s+equilibrium|alk\s+sir|ns\s+sir|mt\s+sir)\b",
            title_clean,
            re.I,
        ):
            return False
    elif subject == "Chemistry Olympiad":
        if any(
            k in ch_low
            for k in (
                "mathsmerizing",
                "maths unplugged",
                "prashant jain",
                "pj sir",
                "jee math rankers",
                "indian school of physics",
                "physics sir jee",
                "vinay uppal",
                "physics heist",
                "physics galaxy",
                "3blue1brown",
                "michael penn",
                "mindyourdecisions",
                "stand-up maths",
                "standupmaths",
                "numberphile",
                "dr. becky",
                "dr becky",
                "pbs space time",
            )
        ):
            return False
        if re.search(
            r"\b(ioqm|prmo|rmo|inmo|nsep|inpho|ipho|nsejs|ijso|nsea|ioaa|physics|kinematics|rotational|electrostatics|magnetism|optics|abj\s+sir|mt\s+sir)\b",
            title_clean,
            re.I,
        ):
            return False
    elif subject == "Jr Science & Astronomy":
        if ch_no == 33:
            # Module 33: Either explicit NSEJS/IJSO/INBO/IBO Biology OR MIT OCW / Professor Dave / Organic Chem Tutor Cell Bio/Genetics
            has_jr_bio = bool(
                re.search(r"\b(nsejs|ijso|injso|junior\s+science|inbo|ibo|olympiad)\b", blob_tc, re.I)
                and re.search(
                    r"\b(biology|cell|genetics|heredity|physiology|life\s+processes|reproduction|ecology|evolution|digestion|respiration|circulation|excretion|plant|human|tissue\w*)\b",
                    title_clean,
                    re.I,
                )
            )
            has_global_bio = any(
                k in ch_low for k in ("mit opencourseware", "professor dave explains", "the organic chemistry tutor")
            ) and bool(
                re.search(
                    r"\b(cell\s+biology|genetics|mendel\w*|human\s+physiology|cellular\s+respiration|mitosis|meiosis|7\.01\d)\b",
                    title_clean,
                    re.I,
                )
            )
            if not (has_jr_bio or has_global_bio):
                return False
        elif ch_no == 34:
            # Module 34: Astronomy & Astrophysics
            if any(
                k in ch_low
                for k in (
                    "iitian explains",
                    "sachin rana",
                    "dexterchem",
                    "mathsmerizing",
                    "maths unplugged",
                    "michael penn",
                    "numberphile",
                )
            ):
                return False
            if re.search(r"\b(ioqm|prmo|rmo|inmo|nsec|incho|nsejs\s+biology|nsejs\s+chemistry)\b", title_clean, re.I):
                return False

    # 6. Prevent Cross-Module Collisions Within the Same Stream
    if ch_no == 1 and re.search(r"\b(diophantine|lifting\s+the\s+exponent|\blte\b|pell'?s?\s+equation)\b", title_clean, re.I):
        return False
    if ch_no == 12 and re.search(r"\b(ioqm|prmo)\b", title_clean, re.I) and not re.search(r"\b(rmo|inmo|imo)\b", title_clean, re.I):
        return False
    if ch_no == 14 and re.search(r"\b(rotational|rigid\s+body|\brbd\b|moment\s+of\s+inertia)\b", title_clean, re.I):
        return False
    if ch_no == 22:
        has_optics_mod = bool(
            re.search(
                r"\b(geometrical\s+optics|ray\s+optics|wave\s+optics|refraction|prism|lens|mirror|interference|diffraction|\bydse\b|polarization|modern\s+physics|photoelectric|bohr\w*|de\s+broglie|nuclear\s+physics|radioactivity|x[\s-]*rays?|relativity)\b",
                title_clean,
                re.I,
            )
        )
        has_nsep_paper = bool(
            re.search(
                r"\b(nsep|inpho|ipho)\b.*\b(paper|solution\w*|pyq\w*|marathon|revision|previous\s+year|mock|complete|201\d|202\d)\b|\b(paper|solution\w*|pyq\w*|marathon|previous\s+year)\b.*\b(nsep|inpho|ipho)\b",
                title_clean,
                re.I,
            )
        )
        if not (has_optics_mod or has_nsep_paper):
            return False
    if ch_no == 30:
        has_spec_bio = bool(
            re.search(
                r"\b(spectroscop\w*|\bnmr\b|infrared|\bir\s+spectroscop\w*|mass\s+spectrometr\w*|\buv[\s-]*vis\b|chemical\s+shift|biomolecules?|carbohydrates?|amino\s+acids?|peptides?|proteins?)\b",
                title_clean,
                re.I,
            )
        )
        has_nsec_paper = bool(
            re.search(
                r"\b(nsec|incho|icho)\b.*\b(paper|solution\w*|pyq\w*|marathon|revision|previous\s+year|walkthrough|mock|complete|201\d|202\d)\b|\b(paper|solution\w*|pyq\w*|marathon|previous\s+year)\b.*\b(nsec|incho|icho)\b",
                title_clean,
                re.I,
            )
        )
        if not (has_spec_bio or has_nsec_paper):
            return False
    if ch_no == 39 and re.search(r"\b(segment\s+trees?|fenwick\s+trees?|binary\s+indexed\s+trees?)\b", title_clean, re.I):
        return False

    # 7. Strict Module Keyword Match
    if not chapter_re.search(title):
        return False

    return True


def parse_age_months(published_text: str) -> float:
    """Parse YouTube relative published text ('3 weeks ago', 'Streamed 4 months ago') into months."""
    if not published_text:
        return 18.0
    low = published_text.lower()
    m = re.search(r"(\d+)\s*(hour|day|week|month|year)", low)
    if not m:
        return 18.0
    n = float(m.group(1))
    unit = m.group(2)
    if unit == "hour":
        return 0.15
    if unit == "day":
        return max(0.2, n / 30.0)
    if unit == "week":
        return max(0.3, (n * 7.0) / 30.0)
    if unit == "month":
        return max(0.5, n)
    if unit == "year":
        return max(12.0, n * 12.0)
    return 18.0


def compute_trend_metrics(cand: dict, fmt: str) -> tuple[float, int, float, str]:
    """Compute pure YouTube audience trend score with ZERO coaching/institute priority.

    Returns (age_months, views_per_month, trend_score, trend_badge).
    """
    if cand["provider"] == "playlist":
        lessons = cand["lesson_count"]
        t_score = 64.0 + min(lessons, 45) * 0.42 + (3.5 if cand.get("sample_lectures") else 0.0)
        badge = f"📚 {lessons} Lectures" if lessons else "📚 Full Playlist"
        return 12.0, 0, round(t_score, 2), badge

    views = max(int(cand.get("view_count") or 0), 1)
    age_m = parse_age_months(cand.get("published") or "")
    vpm = int(round(views / max(age_m, 0.75)))

    # Pure YouTube traction formula: monthly view velocity + total student reach + freshness
    velocity_pts = math.log10(max(vpm, 1)) * 13.5
    reach_pts = math.log10(views) * 9.5
    freshness_pts = 8.0 if age_m <= 6.0 else (4.5 if age_m <= 14.0 else (2.0 if age_m <= 24.0 else 0.0))
    depth_pts = 3.5 if cand.get("duration_sec", 0) >= 5400 else 1.5
    t_score = round(velocity_pts + reach_pts + freshness_pts + depth_pts, 2)

    if vpm >= 35_000 or (age_m <= 8.0 and views >= 120_000):
        badge = "🔥 Trending"
    elif views >= 1_000_000:
        badge = "⭐ Most Loved"
    elif views >= 250_000 or vpm >= 12_000:
        badge = "📈 Popular"
    else:
        badge = f"⚡ {fmt}"

    return round(age_m, 1), vpm, t_score, badge


def build_pedagogy_note(cand: dict, educator: str, exam: str, fmt: str, chapter_name: str) -> str:
    if cand["provider"] == "playlist":
        lessons = f"{cand['lesson_count']}-lecture " if cand["lesson_count"] else "Complete "
        return f"{lessons}YouTube playlist by {educator} · {exam} ({chapter_name})."
    parts = []
    if cand["duration"]:
        parts.append(f"{cand['duration']} {fmt.lower()}")
    else:
        parts.append(fmt)
    parts.append(f"by {educator}")
    if cand["views_text"]:
        parts.append(f"· {cand['views_text']}")
    return " ".join(parts)


def build_corpus(use_cache: bool = True) -> dict:
    compiled_chapters = []
    chapter_tasks = []
    for row in SYLLABUS:
        (
            ch_no,
            subject,
            unit,
            class_lvl,
            weightage,
            scope,
            ch_name,
            pat,
            pl_q1,
            pl_q2,
            long_q,
            focus_q1,
            focus_q2,
        ) = row
        cre = re.compile(pat, re.I)
        compiled_chapters.append((ch_no, subject, unit, class_lvl, weightage, scope, ch_name, cre))
        # Playlists Only
        chapter_tasks.append(("chapter", ch_no, subject, cre, pl_q1, SP_PLAYLIST_ONLY))
        chapter_tasks.append(("chapter", ch_no, subject, cre, pl_q2, SP_PLAYLIST_ONLY))
        # Deep Long-Form Lectures (>20m)
        chapter_tasks.append(("chapter", ch_no, subject, cre, long_q, SP_LONG_VIDEOS))
        chapter_tasks.append(("chapter", ch_no, subject, cre, pl_q1, SP_LONG_VIDEOS))
        # Focused Olympiad Walkthroughs & Problem Sessions (>= 8m / 480s)
        chapter_tasks.append(("chapter", ch_no, subject, cre, focus_q1, ""))
        chapter_tasks.append(("chapter", ch_no, subject, cre, focus_q2, ""))

    for subj, tq in TEACHER_PLAYLIST_SWEEPS:
        chapter_tasks.append(("sweep", 0, subj, None, tq, SP_PLAYLIST_ONLY))
    for subj, vq in CHANNEL_VIDEO_SWEEPS:
        chapter_tasks.append(("sweep", 0, subj, None, vq, ""))

    print(
        f"Executing {len(chapter_tasks)} YouTube InnerTube queries across {len(SYLLABUS)} Olympiad modules...",
        flush=True,
    )

    raw_results: dict[int, list[dict]] = {row[0]: [] for row in SYLLABUS}
    sweep_candidates: list[tuple[str, dict]] = []

    def worker(task):
        kind, ch_no, subject, cre, query, sp = task
        payload = search_youtube(query, params=sp, use_cache=use_cache)
        cands = extract_candidates(payload)
        if kind == "chapter":
            kept = [c for c in cands if is_valid_chapter_candidate(c, ch_no, subject, cre)]
            return kind, ch_no, subject, kept
        return kind, 0, subject, cands

    with ThreadPoolExecutor(max_workers=24) as pool:
        futures = [pool.submit(worker, t) for t in chapter_tasks]
        for fut in as_completed(futures):
            kind, ch_no, subject, items = fut.result()
            if kind == "chapter":
                raw_results[ch_no].extend(items)
            else:
                for c in items:
                    sweep_candidates.append((subject, c))

    # Route specialized modules first so specific modules (e.g. Diophantine, Circle Geometry, Segment Trees,
    # NSEJS Physics/Chem/Bio) claim matching sweeps before broader umbrella/marathon modules.
    specialized_first = {2, 7, 9, 10, 11, 15, 22, 30, 31, 32, 33, 34, 37, 40}
    priority_chapters = sorted(
        compiled_chapters,
        key=lambda c: (0 if c[0] in specialized_first else 1, c[0]),
    )
    for subj, cand in sweep_candidates:
        for ch_no, c_subj, _, _, _, _, _, cre in priority_chapters:
            if c_subj == subj and is_valid_chapter_candidate(cand, ch_no, c_subj, cre):
                raw_results[ch_no].append(cand)
                break

    processing_order = sorted(
        compiled_chapters,
        key=lambda c: (0 if c[0] in specialized_first else 1, c[0]),
    )

    seen_global: set[tuple[str, str]] = set()
    chapter_records_map: dict[int, list[dict]] = {}
    chapter_meta_map: dict[int, dict] = {}

    for ch_no, subject, unit, class_lvl, weightage, scope, ch_name, _ in processing_order:
        candidates = raw_results[ch_no]

        enriched = []
        seen_local: set[tuple[str, str]] = set()
        for cand in candidates:
            gkey = (cand["provider"], cand["video_id"])
            if gkey in seen_global or gkey in seen_local:
                continue
            seen_local.add(gkey)
            exam, fmt = classify_exam_and_format(cand, subject)
            age_m, vpm, t_score, t_badge = compute_trend_metrics(cand, fmt)
            enriched.append((t_score, age_m, vpm, t_badge, exam, fmt, cand))

        # 100% Pure YouTube Trend & Popularity pools — ZERO artificial institute priority
        videos_pool = sorted(
            [x for x in enriched if x[6]["provider"] == "youtube"],
            key=lambda x: (-x[0], -x[2], -x[6]["view_count"]),
        )
        playlists_pool = sorted(
            [x for x in enriched if x[6]["provider"] == "playlist"],
            key=lambda x: (-x[0], -x[6]["lesson_count"]),
        )
        combined_pool = sorted(
            enriched,
            key=lambda x: (-x[0], -x[2], -x[6]["view_count"], -x[6]["lesson_count"]),
        )

        unique_ch: list[dict] = []
        edu_cap: dict[str, int] = {}

        def _try_take(pool_items: list, limit_count: int, per_edu_max: int) -> None:
            for t_score, age_m, vpm, t_badge, exam, fmt, cand in pool_items:
                if len(unique_ch) >= limit_count:
                    break
                gkey = (cand["provider"], cand["video_id"])
                if gkey in seen_global:
                    continue
                institute = resolve_institute(cand)
                educator = resolve_educator(cand, subject, unit)
                ekey = f"{educator.casefold()}::{cand['provider']}"
                if edu_cap.get(ekey, 0) >= per_edu_max:
                    continue
                seen_global.add(gkey)
                edu_cap[ekey] = edu_cap.get(ekey, 0) + 1
                lang = resolve_language(cand)

                unique_ch.append(
                    {
                        "provider": cand["provider"],
                        "video_id": cand["video_id"],
                        "embed_video_id": cand["embed_video_id"],
                        "url": cand["url"],
                        "title": cand["title"],
                        "channel": cand["channel"],
                        "channel_url": cand["channel_url"],
                        "institute": institute,
                        "educator": educator,
                        "language": lang,
                        "thumbnail": cand["thumbnail"],
                        "subject": subject,
                        "unit": unit,
                        "chapter_no": ch_no,
                        "chapter": ch_name,
                        "class_level": class_lvl,
                        "weightage": weightage,
                        "syllabus_scope": scope,
                        "target_exam": exam,
                        "format": fmt,
                        "lesson_count": cand["lesson_count"],
                        "duration": cand["duration"],
                        "duration_sec": cand["duration_sec"],
                        "views_text": cand["views_text"],
                        "view_count": cand["view_count"],
                        "published": cand["published"],
                        "age_months": age_m,
                        "views_per_month": vpm,
                        "trend_score": t_score,
                        "trend_badge": t_badge,
                        "score": t_score,
                        "note": build_pedagogy_note(cand, educator, exam, fmt, ch_name),
                        "sample_lectures": cand.get("sample_lectures") or [],
                    }
                )

        # Balanced selection purely by YouTube Trend & Popularity (12 top trending videos + 8 top playlists)
        _try_take(videos_pool, 12, 2)
        _try_take(playlists_pool, len(unique_ch) + 8, 2)
        if len(unique_ch) < 18:
            _try_take(combined_pool, 20, 4)
        if len(unique_ch) < 10:
            _try_take(combined_pool, 16, 6)

        # Sort strictly by pure YouTube trend_score, views_per_month, view_count — ZERO institute priority
        unique_ch.sort(
            key=lambda r: (
                -r["trend_score"],
                -r["views_per_month"],
                -r["view_count"],
                -r["lesson_count"],
            )
        )
        pl_cnt = sum(1 for r in unique_ch if r["provider"] == "playlist")

        exam_label = SUBJECT_TO_EXAM[subject]
        yt_pl_q = urllib.parse.quote_plus(f"{ch_name} {exam_label}")
        yt_os_q = urllib.parse.quote_plus(f"{ch_name} Olympiad lecture")

        chapter_records_map[ch_no] = unique_ch
        chapter_meta_map[ch_no] = {
            "chapter_no": ch_no,
            "subject": subject,
            "unit": unit,
            "class_level": class_lvl,
            "weightage": weightage,
            "syllabus_scope": scope,
            "chapter": ch_name,
            "count": len(unique_ch),
            "playlist_count": pl_cnt,
            "video_count": len(unique_ch) - pl_cnt,
            "yt_playlists_url": f"https://www.youtube.com/results?search_query={yt_pl_q}&sp=EgIQAw%253D%253D",
            "yt_oneshots_url": f"https://www.youtube.com/results?search_query={yt_os_q}&sp=EgIYAg%253D%253D",
        }

    # Assemble in canonical syllabus order 1..40
    syllabus_out = [chapter_meta_map[n] for n in range(1, len(SYLLABUS) + 1)]
    all_entries: list[dict] = []
    for n in range(1, len(SYLLABUS) + 1):
        all_entries.extend(chapter_records_map[n])

    by_score = sorted(
        all_entries,
        key=lambda x: (-x["trend_score"], -x["views_per_month"], -x["view_count"], x["chapter_no"]),
    )
    for idx, rec in enumerate(by_score, 1):
        rec["global_rank"] = idx

    edu_buckets: dict[str, dict] = {}
    for rec in all_entries:
        edu = rec["educator"]
        if edu not in edu_buckets:
            edu_buckets[edu] = {
                "educator": edu,
                "subjects": Counter(),
                "total": 0,
                "playlists": 0,
                "videos": 0,
                "chapters": set(),
            }
        b = edu_buckets[edu]
        b["subjects"][rec["subject"]] += 1
        b["total"] += 1
        b["chapters"].add(rec["chapter_no"])
        if rec["provider"] == "playlist":
            b["playlists"] += 1
        else:
            b["videos"] += 1

    educators_out = []
    for edu, b in edu_buckets.items():
        primary_subject = b["subjects"].most_common(1)[0][0]
        educators_out.append(
            {
                "educator": edu,
                "subject": primary_subject,
                "total": b["total"],
                "playlists": b["playlists"],
                "videos": b["videos"],
                "chapter_coverage": len(b["chapters"]),
            }
        )
    educators_out.sort(
        key=lambda e: (
            -e["total"],
            -e["playlists"],
            e["educator"],
        )
    )

    inst_buckets: dict[str, dict] = {}
    for rec in all_entries:
        inst = rec["institute"]
        if inst not in inst_buckets:
            inst_buckets[inst] = {
                "institute": inst,
                "total": 0,
                "playlists": 0,
                "videos": 0,
                "chapters": set(),
            }
        ib = inst_buckets[inst]
        ib["total"] += 1
        ib["chapters"].add(rec["chapter_no"])
        if rec["provider"] == "playlist":
            ib["playlists"] += 1
        else:
            ib["videos"] += 1

    institutes_out = [
        {
            "institute": inst,
            "total": ib["total"],
            "playlists": ib["playlists"],
            "videos": ib["videos"],
            "chapter_coverage": len(ib["chapters"]),
        }
        for inst, ib in inst_buckets.items()
    ]
    institutes_out.sort(
        key=lambda i: (
            -i["total"],
            i["institute"],
        )
    )

    playlists_total = sum(1 for x in all_entries if x["provider"] == "playlist")
    chapters_with_pl = sum(1 for c in syllabus_out if c["playlist_count"] > 0)

    output = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "chapters_total": len(SYLLABUS),
            "chapters_populated": sum(1 for c in syllabus_out if c["count"] > 0),
            "chapters_with_playlists": chapters_with_pl,
            "entries_published": len(all_entries),
            "playlists_published": playlists_total,
            "videos_published": len(all_entries) - playlists_total,
            "distinct_institutes": len(institutes_out),
            "distinct_educators": len(educators_out),
            "distinct_channels": len({x["channel"].casefold() for x in all_entries}),
            "queries_executed": len(chapter_tasks),
            "live_requests": STATS["requests"],
            "cached_requests": STATS["cached"],
        },
        "institutes": institutes_out,
        "educators": educators_out,
        "syllabus": syllabus_out,
        "videos": all_entries,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return output


def self_test() -> None:
    assert len(SYLLABUS) == 40, f"Expected 40 canonical Olympiad modules, got {len(SYLLABUS)}"
    nums = [r[0] for r in SYLLABUS]
    assert nums == list(range(1, 41)), "Module numbers must be contiguous 1..40"

    counts_by_stream = Counter(r[1] for r in SYLLABUS)
    assert counts_by_stream["Maths Olympiad"] == 12
    assert counts_by_stream["Physics Olympiad"] == 10
    assert counts_by_stream["Chemistry Olympiad"] == 8
    assert counts_by_stream["Jr Science & Astronomy"] == 5
    assert counts_by_stream["Informatics Olympiad"] == 5

    assert parse_views("1.8M views") == 1_800_000
    assert parse_views("425K views") == 425_000
    assert parse_duration_seconds("12:30") == 750
    assert parse_duration_seconds("7:30") == 450

    # Verify >= 8m (480s) acceptance for focused Olympiad walkthroughs (e.g. Michael Penn 12m30s)
    cre_nt = re.compile(SYLLABUS[1][7], re.I)
    good_walkthrough = {
        "provider": "youtube",
        "video_id": "abcdefghijk",
        "title": "A nice Diophantine equation from the IMO!",
        "channel": "Michael Penn",
        "channel_url": "https://www.youtube.com/@MichaelPennMath",
        "lesson_count": 0,
        "duration_sec": 750,
        "view_count": 180000,
        "sample_lectures": [],
    }
    assert is_valid_chapter_candidate(good_walkthrough, 2, "Maths Olympiad", cre_nt)
    exam, fmt = classify_exam_and_format(good_walkthrough, "Maths Olympiad")
    assert exam == "IOQM / INMO" and fmt == "Olympiad Problems"

    # Reject < 8m (480s) clip
    too_short = dict(good_walkthrough, duration_sec=420)
    assert not is_valid_chapter_candidate(too_short, 2, "Maths Olympiad", cre_nt)

    # Verify NeetCode is allowed in Informatics Olympiad and never misblocked by NEET filter
    cre_graph = re.compile(SYLLABUS[38][7], re.I)
    good_neetcode = {
        "provider": "youtube",
        "video_id": "1234567890a",
        "title": "Dijkstra's Shortest Path Algorithm - Graph Theory",
        "channel": "NeetCode",
        "channel_url": "https://www.youtube.com/@NeetCode",
        "lesson_count": 0,
        "duration_sec": 920,
        "view_count": 540000,
        "sample_lectures": [],
    }
    assert is_valid_chapter_candidate(good_neetcode, 39, "Informatics Olympiad", cre_graph)
    # Cross-stream guard: NeetCode must NOT leak into Maths Olympiad
    cre_math_graph = re.compile(SYLLABUS[6][7], re.I)
    assert not is_valid_chapter_candidate(good_neetcode, 7, "Maths Olympiad", cre_math_graph)

    # Reject admit card / cutoff noise
    bad_cutoff = {
        "provider": "youtube",
        "video_id": "cutoff12345",
        "title": "IOQM Expected Cutoff & Admit Card Download",
        "channel": "Vedantu Olympiad School",
        "channel_url": "",
        "lesson_count": 0,
        "duration_sec": 900,
        "view_count": 50000,
        "sample_lectures": [],
    }
    cre_ioqm = re.compile(SYLLABUS[10][7], re.I)
    assert not is_valid_chapter_candidate(bad_cutoff, 11, "Maths Olympiad", cre_ioqm)

    print("self-test ok (40 canonical Olympiad modules across 5 streams, >=480s & trend-only guards validated)", flush=True)


def main(argv: list[str]) -> int:
    if "--self-test" in argv:
        self_test()
        return 0
    self_test()
    use_cache = "--fresh" not in argv
    out = build_corpus(use_cache=use_cache)
    m = out["meta"]
    inst_lines = "\n".join(
        f"  - {i['institute']:<44}: {i['total']:>4} ({i['playlists']:>3} PL, {i['videos']:>3} vids across {i['chapter_coverage']:>2} mod)"
        for i in out["institutes"]
    )
    min_mod = min(out["syllabus"], key=lambda c: c["count"])
    print(
        f"\n=== OLYMPIADTUBE 40-MODULE CORPUS REPORT ===\n"
        f"Modules populated       : {m['chapters_populated']} / {m['chapters_total']}\n"
        f"Modules with playlists  : {m['chapters_with_playlists']} / {m['chapters_total']}\n"
        f"Minimum module count    : {min_mod['count']} (Module {min_mod['chapter_no']}: {min_mod['chapter']})\n"
        f"Total Olympiad resources: {m['entries_published']} ({m['playlists_published']} playlists, {m['videos_published']} lectures)\n"
        f"Distinct ecosystems     : {m['distinct_institutes']}\n"
        f"Distinct educators      : {m['distinct_educators']} ({m['distinct_channels']} verified channels)\n"
        f"Ecosystem Breakdown:\n{inst_lines}\n"
        f"Output written to       : {OUT_PATH}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
