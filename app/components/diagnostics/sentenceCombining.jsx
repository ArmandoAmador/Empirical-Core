import React from 'react'
var Markdown = require('react-remarkable');
import {connect} from 'react-redux'
import { Link } from 'react-router'
import Question from '../../libs/diagnosticQuestion'
import Textarea from 'react-textarea-autosize';
import icon from '../../img/question_icon.svg'
import _ from 'underscore'
import {hashToCollection} from '../../libs/hashToCollection'
import {submitResponse, clearResponses} from '../../actions/diagnostics.js'
import ReactTransition from 'react-addons-css-transition-group'
import questionActions from '../../actions/questions'
import pathwayActions from '../../actions/pathways'
var C = require("../../constants").default
import rootRef from "../../libs/firebase"
const sessionsRef = rootRef.child('sessions')
import ResponseComponent from '../questions/responseComponent.jsx'
import {
  loadResponseDataAndListen,
  stopListeningToResponses
} from '../../actions/responses.js'

import RenderQuestionFeedback from '../renderForQuestions/feedbackStatements.jsx'
import RenderQuestionCues from '../renderForQuestions/cues.jsx'
import RenderSentenceFragments from '../renderForQuestions/sentenceFragments.jsx'
import RenderFeedback from '../renderForQuestions/feedback.jsx'
import generateFeedbackString from '../renderForQuestions/generateFeedbackString.js'
import getResponse from '../renderForQuestions/checkAnswer.js'
import handleFocus from '../renderForQuestions/handleFocus.js'
import submitQuestionResponse from '../renderForQuestions/submitResponse.js'
import updateResponseResource from '../renderForQuestions/updateResponseResource.js'
import submitPathway from '../renderForQuestions/submitPathway.js'

import StateFinished from '../renderForQuestions/renderThankYou.jsx'
import AnswerForm from '../renderForQuestions/renderFormForAnswer.jsx'
import TextEditor from '../renderForQuestions/renderTextEditor.jsx'
const feedbackStrings = C.FEEDBACK_STRINGS

const PlayDiagnosticQuestion = React.createClass({
  getInitialState: function () {
    return {
      editing: false,
      response: "",
      readyForNext: false
    }
  },

  getInitialValue: function () {
    if (this.props.prefill) {
      return this.getQuestion().prefilledText
    }
  },

  componentWillMount: function () {
    const questionID = this.props.question.key
    this.props.dispatch(loadResponseDataAndListen(questionID))
  },

  componentWillUnmount: function () {
    console.log("Unmounting");
    const questionID = this.props.question.key;
    this.props.dispatch(stopListeningToResponses(questionID))
  },

  getResponses: function () {
    return this.props.responses.data[this.props.question.key]
  },

  removePrefilledUnderscores: function () {
    this.setState({response: this.state.response.replace(/_/g, "")})
  },

  getQuestion: function () {
    return this.props.question
  },


  getResponse2: function (rid) {
    const {data} = this.props.questions, questionID = this.props.question.key;
    return data[questionID].responses[rid]
  },

  submitResponse: function(response) {
    submitQuestionResponse(response,this.props,this.state.sessionKey,submitResponse);
  },

  renderSentenceFragments: function () {
    return <RenderSentenceFragments getQuestion={this.getQuestion}/>
  },

  listCuesAsString: function (cues) {
    var newCues = cues.slice(0);
    return newCues.splice(0, newCues.length - 1).join(", ") + " or " + newCues.pop() + "."
  },

  renderFeedback: function () {
    return <RenderFeedback question={this.props.question} renderFeedbackStatements = {this.renderFeedbackStatements}
            sentence="We have not seen this sentence before. Could you please try writing it in another way?"
            getQuestion={this.getQuestion} listCuesAsString={this.listCuesAsString} />
  },

  getErrorsForAttempt: function (attempt) {
    return _.pick(attempt, ...C.ERROR_TYPES)
  },

  renderFeedbackStatements: function (attempt) {
    return <RenderQuestionFeedback attempt={attempt} getErrorsForAttempt={this.getErrorsForAttempt} getQuestion={this.getQuestion}/>
  },

  renderCues: function () {
    return <RenderQuestionCues getQuestion={this.getQuestion}/>
  },

  updateResponseResource: function (response) {
    updateResponseResource(response, this.getQuestion().key, this.getQuestion().attempts, this.props.dispatch)
  },

  submitPathway: function (response) {
    submitPathway(response, this.props)
  },

  checkAnswer: function (e) {
    if (this.state.editing) {
      this.removePrefilledUnderscores()
      var response = getResponse(this.getQuestion(), this.state.response, this.getResponses(), "diagnostic")
      this.updateResponseResource(response)
      this.submitResponse(response)
      this.setState({
        editing: false,
        response: ""
      },
        this.nextQuestion()
      )
    }
  },

  toggleDisabled: function () {
    if (this.state.editing) {
      return "";
    }
    return "is-disabled"
  },

  handleChange: function (e) {
    this.setState({editing: true, response: e})
  },

  readyForNext: function () {
    if (this.props.question.attempts.length > 0 ) {
      var latestAttempt = getLatestAttempt(this.props.question.attempts)
      if (latestAttempt.found) {
        var errors = _.keys(this.getErrorsForAttempt(latestAttempt))
        if (latestAttempt.response.optimal && errors.length === 0) {
          return true
        }
      }
    }
    return false
  },

  getProgressPercent: function () {
    return this.props.question.attempts.length / 3 * 100
  },

  finish: function () {
    this.setState({finished: true})
  },

  nextQuestion: function () {
    this.setState({response: ""})
    this.props.nextQuestion()
    this.setState({response: ""})
  },

  renderNextQuestionButton:  function (correct) {
    if (correct) {
      return (<button className="button is-outlined is-success" onClick={this.nextQuestion}>Next</button>)
    } else {
      return (<button className="button is-outlined is-warning" onClick={this.nextQuestion}>Next</button>)
    }

  },

  render: function () {
    const questionID = this.props.question.key;
    var button;
    if(this.props.question.attempts.length > 0) {
      button = <button className="button student-submit" onClick={this.nextQuestion}>Next</button>
    } else {
      button = <button className="button student-submit" onClick={this.checkAnswer}>Submit</button>
    }
    if (this.props.question) {
      const instructions = (this.props.question.instructions && this.props.question.instructions!=="") ? this.props.question.instructions : "Combine the sentences into one sentence."
      return (
        <div className="student-container-inner-diagnostic">
          {this.renderSentenceFragments()}
          {this.renderCues()}
          <div className="feedback-row">
            <img src={icon}/>
            <p>{instructions}</p>
          </div>
          <h5 className="title is-5"></h5>
          <ReactTransition transitionName={"text-editor"} transitionAppear={true} transitionLeaveTimeout={500} transitionAppearTimeout={500} transitionEnterTimeout={500}>
            <TextEditor className="textarea is-question is-disabled" defaultValue={this.getInitialValue()}
                        handleChange={this.handleChange} value={this.state.response} getResponse={this.getResponse2}
                        disabled={this.readyForNext()} checkAnswer={this.checkAnswer}/>
            <div className="question-button-group button-group">
              {button}
            </div>
          </ReactTransition>
        </div>
      )
    } else {
      return (<p>Loading...</p>)
    }
  }
})

const getLatestAttempt = function (attempts = []) {
  const lastIndex = attempts.length - 1;
  return attempts[lastIndex]
}

function select(state) {
  return {
    concepts: state.concepts,
    questions: state.questions,
    routing: state.routing,
    responses: state.responses
  }
}
export default connect(select)(PlayDiagnosticQuestion)
