package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
)

const (
	maxWeeklyHours     = 168
	maxUpdateBodyBytes = 1 << 10
)

type person struct {
	ID          int     `json:"id" db:"id"`
	Name        string  `json:"name" db:"name"`
	WeeklyHours float64 `json:"weeklyHours" db:"weekly_hours"`
}

const updateWeeklyHoursQuery = `
UPDATE people
SET weekly_hours = $2
WHERE id = $1
RETURNING id, name, weekly_hours::float8 AS weekly_hours`

func (s *server) handleUpdatePerson(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "person id must be a positive integer")
		return
	}

	hours, err := parseWeeklyHours(http.MaxBytesReader(w, r.Body, maxUpdateBodyBytes))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updated, err := s.updateWeeklyHours(r.Context(), id, hours)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	if err != nil {
		log.Printf("update person %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not update person")
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (s *server) updateWeeklyHours(ctx context.Context, id int, hours float64) (person, error) {
	rows, err := s.db.Query(ctx, updateWeeklyHoursQuery, id, hours)
	if err != nil {
		return person{}, err
	}
	return pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[person])
}

func parseWeeklyHours(body io.Reader) (float64, error) {
	var req struct {
		WeeklyHours *float64 `json:"weeklyHours"`
	}
	dec := json.NewDecoder(body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		return 0, errors.New(`body must be JSON like {"weeklyHours": 32}`)
	}
	if req.WeeklyHours == nil {
		return 0, errors.New("weeklyHours is required")
	}
	if hours := *req.WeeklyHours; hours < 0 || hours > maxWeeklyHours {
		return 0, fmt.Errorf("weeklyHours must be between 0 and %d", maxWeeklyHours)
	}
	return *req.WeeklyHours, nil
}
