# Fix later

Things to come back to once the main features are in.

- [ ] Logging sheet feels awkward and looks ugly — redesign it.
- [ ] XP totals are added up in the browser from every entry row; Supabase
      returns at most 1000 rows per request, so very big Dexes will under-count.
      Move totals into a database view/function (do this with the leaderboard).
