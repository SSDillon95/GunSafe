import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-3">
            <a
              href="https://primelogic.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Image
                src="/prime-logic-logo.png"
                alt="Prime Logic"
                width={180}
                height={54}
                className="h-10 w-auto"
              />
            </a>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Serving the Southeast for over 30 years with reliable security
              solutions that protect people, property, and peace of mind.
            </p>
          </div>

          <div className="text-sm text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Prime Logic, Inc.</p>
            <p>
              <a
                href="https://maps.google.com/?q=264+S+Veterans+Memorial+Blvd,+Tupelo,+MS+38804"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                264 S Veterans Memorial Blvd
                <br />
                Tupelo, MS 38804
              </a>
            </p>
            <p>
              <a
                href="tel:+16628411390"
                className="hover:text-white transition"
              >
                (662) 841-1390
              </a>
            </p>
            <p>
              <a
                href="mailto:info@PrimeLogic.pro"
                className="hover:text-white transition"
              >
                info@PrimeLogic.pro
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <p>© {year} Prime Logic, Inc. All rights reserved.</p>
          <a
            href="https://primelogic.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition"
          >
            primelogic.pro
          </a>
        </div>
      </div>
    </footer>
  );
}