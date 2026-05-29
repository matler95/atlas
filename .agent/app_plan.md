# App plan

## onboarding

### gather user data

1. user name
2. primary user goal
3. gym experience level
4. gender, age, height and weight
5. available equipment (full gym, bodyweight only, limited equipment (what exactly - distinct from db))
6. availability - gym days in week & session length
7. preferred workout style: full body, upper/lower, push/pull/legs etc
8. add abs to workouts? all/choose days
9. recovery & lifestyle (avg sleep time, activity outside gym, stress level, job activity, additional cardio sessions per week)
10. movement & history

### workout creation, not generation
after onboarding questionaire, there should be workout creation not generation - user creates his own workout by selecting exercises available in db, filtered and sorted by app based on the selections above (suggested first, rest below) with posiibility to search.

app prepares template for user to fill out with exercises from db (some suggested by app based on user answers), depending on user data.
For example if users chooses primary goal as building muscles, full gym, 3 days a week, push/pull/legs, advanced experience - app prefers exercises that fulfill those characteristics. Templated is prepared for push/pull/legs - first workout push exercises etc. Abs optional based on user choice.
The app then assesses the quality of the workout based on algorithms for trained muscle groups completeness etc - shows trained muscles on svg for each workout.
App also should predict session length based on number of exercises, include 2min rest between sets, 10min for warmup and stretch - and warn user that the session may be too long or too short based on number of selected exercises.
User only selects exercises, app calculates sets, reps, volumes based on algorithm docs.

### app screens
#### dashboard
in the dashboard user sees welcome message, today,s date, at a glance: this week planned workout progress, calories and protein targets, user readiness score, below body weight number and line chart with progress, info about upcoming workout (when it will be) or a shortcut to start one if today is workout day.

#### plan
a page with weekly plan overview (type, number of train days, session length) to view and edit workout plan or start one of the trainings.

#### progress
several tabs inside here grouped tematically, app logs user progress in:
* bodyweight, body composition (calculated, approx), hydration, BMI etc
* strength - current weight and chart with progress of weight per each exercise done during workout
* volume - muscle activation this week, sets per muscle group (based on finished workouts), taking into cosideration primary and secondary muscles
* streaks - concurrent weeks of compliting all planned trainings, workout consistency and sticking to the plan + a heatmap similar to githubs commit one

#### library
searchable and filtrable knowledgebase for all exercises in the db, after clicking on the exercise, it should expand and show instructions. Only one expanded at a tim, if user clicks another, second one collapses.

#### profile
user settings like user profile settings, prefferences: units, theme, language (english/polish), notification and reminder settings, editing profile goals, data reset etc - typical mobile app settings

### workout itself
when user starts workout, app automatically starts screen: warmup, user can click go to next exercise at any time, app shows next exercise, current set, weight, reps; user click on set complete, app automatically starts 2min rest timer, after all sets complete, next exercise - all goes until all exercises for given workout are complete. Important: user can override reps number, weight, or select another exercise from workout (does not need to go with the given order). After all exercises are complete, workout feedback appears - prompts user how was it, how it felt etc - used for tweaking weights for upcoming workouts. After collecting user feedback - workout marked as completed and redirects to homescreen.

### algorithms
algorithms docs available in algorithm_doc.md

### essential charasteristics
* mobile first app, PWA
* supabase db connection 
* while being used, app automaticly suggests weight increase, progressive overload, tweaks to exercises
* seemless onboarding + save user profile only after creating account
* high security - minimize leak of personal data
* collect ONLY data that are requried for algorithms
* app acts as personal trainer - feels like AI powered without actual AI - all thanks to smart algorithms and learning while user is using it