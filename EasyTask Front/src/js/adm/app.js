let app = angular.module('myApp', ['ui.router', 'cp.ngConfirm', 'ngMask']);

app.constant('config', {
    name: 'EasyTask',
    version: 'v1.0.0',
    // apiUrl: 'http://api.digitalone.com.br/api/',
    apiUrl: window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:8080',
    baseUrl: 'http://localhost/sbadmin/',
    enableDebug: true
})

app.config([
    '$stateProvider', '$urlRouterProvider', 
    function($stateProvider, $urlRouterProvider){

        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('home', {
                url: '/',
                template: '<h3>Home</h3>'
            })
            .state('about', {
                url: '/about',
                template: '<h3>About</h3>'
            })
            .state('user', {
                url: '/user',
                templateUrl: './pages/user/grid.html',
                controller: function(config, $scope, $http, $ngConfirm){
                    $scope.grid = [];

                    fetch(config.apiUrl + 'users')
                    .then(rs => rs.json())
                    .then(rs => {
                        $scope.grid = rs;
                        $scope.$apply();
                    })

                    //buscar cep na api via cep
                    $scope.getCep = function(cep){
                        let url = 'https://viacep.com.br/ws/'+cep+'/json/';
                        $http.get(url)
                        .then((rs) => {
                            let data = rs.data;
                            $scope.pessoa.rua = data.logradouro
                            $scope.pessoa.complemento = data.complemento
                            $scope.pessoa.bairro = data.bairro
                            $scope.pessoa.cidade = data.localidade
                            $scope.pessoa.uf = data.uf
                        })
                        .catch(() => {
                            alert('ERROR')
                        })
                    }
                    //end

                    $scope.modal = function(data){
                        
                        $scope.pessoa = data;
                        let method = (data == null) ? 'POST' : 'PUT';
                        let url = (data == null) ? config.apiUrl+'user' : config.apiUrl+'user/'+data.id;
                        
                        $ngConfirm({
                            title: 'Editar',
                            contentUrl: './pages/user/form.html',
                            scope: $scope,
                            theme: 'light',
                            typeAnimated: true,
                            closeAnimation: 'scale',
                            columnClass: 'xlarge',
                            buttons: {
                                save: {
                                    text: 'Salvar',
                                    btnClass: 'btn-green',
                                    action: function(){
                                        fetch(url, {
                                            method: method,
                                            headers:{
                                                "Content-Type":"application/json",
                                                "Accept":"application/json"
                                            },
                                            body: JSON.stringify($scope.pessoa)
                                        })
                                        .then(response => response.json())
                                        .then(rs => {
                                            $ngConfirm({
                                                title: config.name,
                                                content: rs.msg
                                            })
                                        })
                                        .catch(() => {
                                            alert('ERROR')
                                        })
                                    }
                                },
                                cancel: {
                                    text: 'Cancelar',
                                    btnClass: 'btn-red'
                                }
                            }
                        })
                    }


                }
            })
}])