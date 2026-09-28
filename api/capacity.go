package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

const maxWeeks = 26

type capacityResponse struct {
	From   string           `json:"from"`
	To     string           `json:"to"`
	Weeks  []string         `json:"weeks"`
	People []personCapacity `json:"people"`
}

// Allocated[i] is the hours booked in capacityResponse.Weeks[i].
type personCapacity struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	WeeklyHours float64   `json:"weeklyHours" db:"weekly_hours"`
	Allocated   []float64 `json:"allocated" db:"allocated"`
}

const capacityQuery = `
WITH weeks AS (
  SELECT monday, monday + 4 AS friday
  FROM unnest($1::date[]) AS monday
),
allocations AS (
  -- Allocation counts Monday to Friday; weekly_hours is a five-day week.
  SELECT a.person_id,
         w.monday,
         sum(a.hours_per_day * (least(a.end_date, w.friday) - greatest(a.start_date, w.monday) + 1)) AS hours
  FROM assignments a
  JOIN weeks w ON a.start_date <= w.friday AND a.end_date >= w.monday
  GROUP BY a.person_id, w.monday
)
SELECT p.id,
       p.name,
       p.weekly_hours::float8 AS weekly_hours,
       array_agg(coalesce(al.hours, 0)::float8 ORDER BY w.monday) AS allocated
FROM people p
CROSS JOIN weeks w
LEFT JOIN allocations al ON al.person_id = p.id AND al.monday = w.monday
GROUP BY p.id
ORDER BY p.name COLLATE "und-x-icu", p.id`

func (s *server) handleCapacity(w http.ResponseWriter, r *http.Request) {
	from, to, err := parseWeekRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var weeks []string
	for _, monday := range weekStarts(from, to) {
		weeks = append(weeks, monday.Format(time.DateOnly))
	}
	people, err := s.loadCapacity(r.Context(), weeks)
	if err != nil {
		log.Printf("load capacity: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load capacity")
		return
	}

	writeJSON(w, http.StatusOK, capacityResponse{
		From:   from.Format(time.DateOnly),
		To:     to.Format(time.DateOnly),
		Weeks:  weeks,
		People: people,
	})
}

func (s *server) loadCapacity(ctx context.Context, weeks []string) ([]personCapacity, error) {
	rows, err := s.db.Query(ctx, capacityQuery, weeks)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[personCapacity])
}

func parseWeekRange(rawFrom, rawTo string) (from, to time.Time, err error) {
	if rawFrom == "" || rawTo == "" {
		return from, to, errors.New("from and to are required (YYYY-MM-DD)")
	}
	if from, err = time.Parse(time.DateOnly, rawFrom); err != nil {
		return from, to, fmt.Errorf("invalid from date %q, expected YYYY-MM-DD", rawFrom)
	}
	if to, err = time.Parse(time.DateOnly, rawTo); err != nil {
		return from, to, fmt.Errorf("invalid to date %q, expected YYYY-MM-DD", rawTo)
	}
	if to.Before(from) {
		return from, to, errors.New("from must not be after to")
	}

	from = startOfWeek(from)
	to = startOfWeek(to).AddDate(0, 0, 6)
	if weeks := len(weekStarts(from, to)); weeks > maxWeeks {
		return from, to, fmt.Errorf("range spans %d weeks, at most %d allowed", weeks, maxWeeks)
	}
	return from, to, nil
}
