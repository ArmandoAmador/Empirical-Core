import React from 'react'
import { connect } from 'react-redux'
import PlayLessonQuestion from './question.jsx'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import {clearData, loadData, nextQuestion, submitResponse, updateName} from '../../actions.js'
import _ from 'underscore'
import {hashToCollection} from '../../libs/hashToCollection'
import {getConceptResultsForAllQuestions, calculateScoreForLesson} from '../../libs/conceptResults/sentenceCombiningLesson'
import Register from './register.jsx'
import Finished from './finished.jsx'

import Spinner from '../shared/spinner.jsx'
const request = require('request');

const Lesson = React.createClass({
  componentWillMount: function() {
    this.props.dispatch(clearData())
  },

  submitResponse: function(response) {
    const action = submitResponse(response);
    this.props.dispatch(action)
  },

  saveToLMS: function () {
    const results = getConceptResultsForAllQuestions(this.props.playLesson.answeredQuestions)
    const score = calculateScoreForLesson(this.props.playLesson.answeredQuestions)
    var sessionID = this.props.location.query.student
    if (sessionID === "null") {
      sessionID = undefined
    }
    const {lessonID} = this.props.params
    if (sessionID) {
      this.finishActivitySession(sessionID, results, score)
    } else {
      this.createAnonActivitySession(lessonID, results, score)
    }
  },

  finishActivitySession: function (sessionID, results, score) {
    request(
      { url: process.env.EMPIRICAL_BASE_URL + '/api/v1/activity_sessions/' + sessionID,
        method: 'PUT',
        json:
        {
          state: 'finished',
          concept_results: results,
          percentage: score
        }
      },
      (err,httpResponse,body) => {
        if (httpResponse.statusCode === 200) {
          console.log("Finished Saving")
          console.log(err,httpResponse,body)
          document.location.href = process.env.EMPIRICAL_BASE_URL + "/activity_sessions/" + this.props.location.query.student
          this.setState({saved: true});
        }
        // console.log(err,httpResponse,body)
      }
    )
  },

  createAnonActivitySession: function (lessonID, results, score) {
    request(
      { url: process.env.EMPIRICAL_BASE_URL + '/api/v1/activity_sessions/',
        method: 'POST',
        json:
        {
          state: 'finished',
          activity_uid: lessonID,
          concept_results: results,
          percentage: score
        }
      },
      (err,httpResponse,body) => {
        if (httpResponse.statusCode === 200) {
          console.log("Finished Saving")
          console.log(err,httpResponse,body)
          document.location.href = process.env.EMPIRICAL_BASE_URL + "/activity_sessions/" + body.activity_session.uid
          this.setState({saved: true});
        }
        // console.log(err,httpResponse,body)
      }
    )
  },

  renderQuestionComponent: function () {
    if (this.props.question.currentQuestion) {
      return (<Question
                question={this.props.question.currentQuestion}
                submitResponse={this.submitResponse}
                prefill={this.getLesson().prefill}/>)
    }
  },

  questionsForLesson: function () {
    const {data} = this.props.lessons, {lessonID} = this.props.params;
    return data[lessonID].questions.map((questionItem) => {
      const questionType = questionItem.questionType || 'questions'
      const key = questionItem.key || questionItem
      return this.props[questionType].data[key]
    })
  },

  startActivity: function (name) {
    this.saveStudentName(name);
    const action = loadData(this.questionsForLesson())
    this.props.dispatch(action);
    const next = nextQuestion();
    this.props.dispatch(next);
  },

  nextQuestion: function () {
    const next = nextQuestion();
    this.props.dispatch(next);
  },

  getLesson: function () {
    return this.props.lessons.data[this.props.params.lessonID]
  },

  getLessonName: function () {
    return this.props.lessons.data[this.props.params.lessonID].name
  },

  saveStudentName: function (name) {
    this.props.dispatch(updateName(name))
  },

  getProgressPercent: function () {
    if (this.props.playLesson && this.props.playLesson.answeredQuestions && this.props.playLesson.questionSet) {
      return this.props.playLesson.answeredQuestions.length / this.props.playLesson.questionSet.length * 100
    } else {
      0
    }

  },

  render: function () {
    // console.log("In the lesson.jsx file.")
    // console.log(this.props)
    const {data} = this.props.lessons, {lessonID} = this.props.params;
    var component;
    var key;
    if (data[lessonID]) {
      if (this.props.playLesson.currentQuestion) {
        key = this.props.playLesson.currentQuestion
        component = (
          <PlayLessonQuestion key={this.props.playLesson.currentQuestion.key} question={this.props.playLesson.currentQuestion} nextQuestion={this.nextQuestion} prefill={this.getLesson().prefill}/>
        )
      }
      else if (this.props.playLesson.answeredQuestions.length > 0 && (this.props.playLesson.unansweredQuestions.length === 0 && this.props.playLesson.currentQuestion === undefined )) {
        component = (
          <Finished
            data={this.props.playLesson}
            name={this.props.location.query.student}
            lessonID={this.props.params.lessonID}
            saveToLMS={this.saveToLMS}
          />
        )
      }
      else {
        component = (
          <Register lesson={this.getLesson()} startActivity={this.startActivity}/>
        )
      }

      return (
        <div>
        <progress className="progress diagnostic-progress" value={this.getProgressPercent()} max="100">15%</progress>
        <section className="section is-fullheight minus-nav student">
        <div className="student-container student-container-diagnostic">
            <ReactCSSTransitionGroup
              transitionName="carousel"
              transitionEnterTimeout={350}
              transitionLeaveTimeout={350}
              >
              {component}
            </ReactCSSTransitionGroup>
          </div>
        </section>
        </div>
      )
    }
    else {
      return (<div className="student-container student-container-diagnostic"><Spinner/></div>)
    }
  }
})

function select(state) {
  return {
    lessons: state.lessons,
    questions: state.questions,
    sentenceFragments: state.sentenceFragments,
    playLesson: state.playLesson, //the questionReducer
    routing: state.routing
  }
}

export default connect(select)(Lesson)
